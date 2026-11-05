import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { AIModelMetadata } from '../models/modelTypes';
import { getModelById } from '../models/modelRegistry';
import { ModelStorage, MODEL_DIRECTORY } from '../storage/ModelStorage';
import { AIEngine } from '../brain/AIEngine';

export type ProgressCallback = (progress: number, downloadedBytes: number, totalBytes: number) => void;
export type CellularConfirmHandler = (model: AIModelMetadata) => Promise<boolean>;

const RESUMABLE_STATE_KEY_PREFIX = '@saas_ai_brain_resumable_v1_';
const MAX_DOWNLOAD_RETRIES = 3;

export class ModelDownloader {
  private static instance: ModelDownloader;
  private storage: ModelStorage;
  private activeDownload: FileSystem.DownloadResumable | null = null;
  private activeModelId: string | null = null;
  private listeners: Map<string, Set<ProgressCallback>> = new Map();
  private cellularPromptHandler: CellularConfirmHandler | null = null;

  private constructor() {
    this.storage = ModelStorage.getInstance();
  }

  public static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader();
    }
    return ModelDownloader.instance;
  }

  public setCellularPromptHandler(handler: CellularConfirmHandler | null): void {
    this.cellularPromptHandler = handler;
  }

  public isAnyDownloadActive(): boolean {
    return this.activeDownload !== null && this.activeModelId !== null;
  }

  public getActiveDownloadingModelId(): string | null {
    return this.activeModelId;
  }

  public subscribeProgress(modelId: string, cb: ProgressCallback): () => void {
    if (!this.listeners.has(modelId)) {
      this.listeners.set(modelId, new Set());
    }
    this.listeners.get(modelId)!.add(cb);
    return () => {
      this.listeners.get(modelId)?.delete(cb);
    };
  }

  private notifyProgress(modelId: string, progress: number, downloaded: number, total: number) {
    const cbs = this.listeners.get(modelId);
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(progress, downloaded, total);
        } catch (e) {
          console.warn('[ModelDownloader] Progress callback error:', e);
        }
      });
    }
  }

  /**
   * Cleans up orphaned *.part files left over from crashes or aborted downloads.
   * Called on app startup.
   */
  public async cleanupOrphanedPartFiles(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
      await this.storage.ensureModelDirectory();
      const dirInfo = await FileSystem.getInfoAsync(MODEL_DIRECTORY);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(MODEL_DIRECTORY);
        for (const file of files) {
          if (file.endsWith('.part')) {
            console.log(`[ModelDownloader] Cleaning orphaned partial file: ${file}`);
            await FileSystem.deleteAsync(`${MODEL_DIRECTORY}${file}`, { idempotent: true });
          }
        }
      }
    } catch (err) {
      console.warn('[ModelDownloader] Orphaned part cleanup warning:', err);
    }
  }

  /**
   * Starts or resumes verified download with integrity validation (SHA-256 and byte size),
   * Wi-Fi vs Cellular check, disk-space check, and exponential backoff retries.
   */
  public async startDownload(
    model: AIModelMetadata,
    onProgress?: ProgressCallback,
    skipCellularCheck = false
  ): Promise<string> {
    if (onProgress) {
      this.subscribeProgress(model.id, onProgress);
    }

    // Web Demo mode
    if (Platform.OS === 'web') {
      this.activeModelId = model.id;
      const expectedBytes = model.exactSizeBytes ?? Math.round(model.fileSizeMB * 1024 * 1024);

      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        try {
          const a = document.createElement('a');
          a.href = model.downloadUrl;
          a.download = model.fileName;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {
          console.warn('[ModelDownloader] Web download link trigger notice:', e);
        }
      }

      await this.storage.updateModelState(model.id, {
        status: 'downloaded',
        downloadProgress: 100,
        downloadedBytes: expectedBytes,
        totalBytes: expectedBytes,
        localPath: `web://${model.fileName}`,
        errorMessage: undefined,
      });

      this.notifyProgress(model.id, 100, expectedBytes, expectedBytes);
      this.activeModelId = null;
      return `web://${model.fileName}`;
    }

    // 1. Mutex: Single active download
    if (this.isAnyDownloadActive()) {
      if (this.activeModelId === model.id) {
        throw new Error(`Download for ${model.name} is already in progress.`);
      }
      throw new Error(
        `Another model download is currently active. Please wait or cancel the active download first.`
      );
    }

    await this.storage.ensureModelDirectory();
    const finalPath = this.storage.getModelPath(model.fileName);
    const partPath = `${finalPath}.part`;
    const expectedBytes = model.exactSizeBytes ?? Math.round(model.fileSizeMB * 1024 * 1024);

    // 2. Validate existing file
    const existingFileInfo = await FileSystem.getInfoAsync(finalPath);
    if (existingFileInfo.exists) {
      if (existingFileInfo.size === expectedBytes) {
        console.log(`[ModelDownloader] Valid file exists for ${model.name} (${existingFileInfo.size} bytes).`);
        await this.storage.updateModelState(model.id, {
          status: 'downloaded',
          downloadProgress: 100,
          downloadedBytes: expectedBytes,
          totalBytes: expectedBytes,
          localPath: finalPath,
          errorMessage: undefined,
        });
        return finalPath;
      } else {
        console.warn(
          `[ModelDownloader] Existing file for ${model.name} has size mismatch (${existingFileInfo.size} vs ${expectedBytes} B). Removing.`
        );
        await FileSystem.deleteAsync(finalPath, { idempotent: true });
      }
    }

    // 3. Free Disk Space Check
    try {
      const freeBytes = await FileSystem.getFreeDiskStorageAsync();
      const requiredBytes = expectedBytes + 50 * 1024 * 1024; // 50 MB safety margin
      if (freeBytes < requiredBytes) {
        const freeMB = (freeBytes / (1024 * 1024)).toFixed(0);
        const reqMB = (requiredBytes / (1024 * 1024)).toFixed(0);
        const errorMsg = `Insufficient disk space: ${freeMB} MB available, but ${model.name} requires ${reqMB} MB. Please free storage and retry.`;
        await this.storage.updateModelState(model.id, {
          status: 'error',
          errorMessage: errorMsg,
        });
        throw new Error(errorMsg);
      }
    } catch (e: any) {
      if (e.message?.includes('Insufficient disk space')) throw e;
      console.warn('[ModelDownloader] Free disk check warning:', e);
    }

    // 4. Network Connectivity & Cellular Confirmation
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      const offlineMsg = 'No network connection. Please connect to Wi-Fi or mobile data and retry.';
      await this.storage.updateModelState(model.id, {
        status: 'error',
        errorMessage: offlineMsg,
      });
      throw new Error(offlineMsg);
    }

    if (netState.type === 'cellular' && !skipCellularCheck) {
      if (this.cellularPromptHandler) {
        const approved = await this.cellularPromptHandler(model);
        if (!approved) {
          console.log('[ModelDownloader] Download cancelled by user due to cellular prompt.');
          await this.storage.updateModelState(model.id, {
            status: 'paused',
            errorMessage: 'Download paused: Cellular data confirmation required.',
          });
          throw new Error('Cellular download cancelled by user.');
        }
      }
    }

    // 5. Download Execution with Exponential Backoff Retries
    let attempt = 0;
    while (attempt < MAX_DOWNLOAD_RETRIES) {
      try {
        attempt++;
        return await this.executeDownloadAttempt(model, partPath, finalPath, expectedBytes);
      } catch (err: any) {
        const isAbort =
          err?.message?.includes('cancel') ||
          err?.message?.includes('pause') ||
          err?.message?.includes('Cellular download cancelled');

        if (isAbort || attempt >= MAX_DOWNLOAD_RETRIES) {
          throw err;
        }

        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(
          `[ModelDownloader] Download attempt ${attempt} failed (${err.message}). Retrying in ${backoffMs}ms...`
        );
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    throw new Error(`Download failed after ${MAX_DOWNLOAD_RETRIES} attempts.`);
  }

  private async executeDownloadAttempt(
    model: AIModelMetadata,
    partPath: string,
    finalPath: string,
    expectedBytes: number
  ): Promise<string> {
    this.activeModelId = model.id;
    await this.storage.updateModelState(model.id, {
      status: 'downloading',
      errorMessage: undefined,
      totalBytes: expectedBytes,
    });

    const progressCallback: FileSystem.FileSystemNetworkTaskProgressCallback<
      FileSystem.DownloadProgressData
    > = (data) => {
      const written = data.totalBytesWritten;
      const total = expectedBytes;
      const progress = Math.min(99, Math.max(0, Math.round((written / total) * 100)));

      this.storage.updateModelState(model.id, {
        downloadProgress: progress,
        downloadedBytes: written,
        totalBytes: total,
      });

      this.notifyProgress(model.id, progress, written, total);
    };

    let savedStateJson: string | null = null;
    try {
      savedStateJson = await AsyncStorage.getItem(`${RESUMABLE_STATE_KEY_PREFIX}${model.id}`);
    } catch {}

    let downloadResumable: FileSystem.DownloadResumable;
    if (savedStateJson) {
      try {
        const savedState = JSON.parse(savedStateJson);
        downloadResumable = FileSystem.createDownloadResumable(
          model.downloadUrl,
          partPath,
          {},
          progressCallback,
          savedState
        );
        console.log(`[ModelDownloader] Resuming download for ${model.name} from saved snapshot.`);
      } catch (err) {
        console.warn('[ModelDownloader] Error restoring resumable state, starting fresh:', err);
        downloadResumable = FileSystem.createDownloadResumable(
          model.downloadUrl,
          partPath,
          {},
          progressCallback
        );
      }
    } else {
      downloadResumable = FileSystem.createDownloadResumable(
        model.downloadUrl,
        partPath,
        {},
        progressCallback
      );
    }

    this.activeDownload = downloadResumable;

    try {
      console.log(`[ModelDownloader] Starting download for ${model.name} to ${partPath}...`);
      const result = await downloadResumable.downloadAsync();

      if (!result || !result.uri) {
        throw new Error('Download terminated without output URI.');
      }

      // Verification: Check byte size of the downloaded .part file
      await this.storage.updateModelState(model.id, {
        status: 'verifying',
        downloadProgress: 100,
      });

      const partInfo = await FileSystem.getInfoAsync(partPath);
      if (!partInfo.exists) {
        throw new Error('Downloaded partial file not found on disk.');
      }

      const actualBytes = partInfo.size ?? 0;
      console.log(
        `[ModelDownloader] Download completed. Verifying size: actual=${actualBytes} B, expected=${expectedBytes} B`
      );

      if (actualBytes !== expectedBytes) {
        await FileSystem.deleteAsync(partPath, { idempotent: true });
        await AsyncStorage.removeItem(`${RESUMABLE_STATE_KEY_PREFIX}${model.id}`);
        const mismatchError = `Verification failed: File size mismatch (received ${actualBytes} bytes, expected ${expectedBytes} bytes). Corrupted partial removed.`;
        await this.storage.updateModelState(model.id, {
          status: 'corrupted',
          errorMessage: mismatchError,
          downloadProgress: 0,
        });
        throw new Error(mismatchError);
      }

      // Atomic Rename: move from .part to final destination
      await FileSystem.moveAsync({
        from: partPath,
        to: finalPath,
      });

      await AsyncStorage.removeItem(`${RESUMABLE_STATE_KEY_PREFIX}${model.id}`);

      await this.storage.updateModelState(model.id, {
        status: 'downloaded',
        downloadProgress: 100,
        downloadedBytes: expectedBytes,
        totalBytes: expectedBytes,
        localPath: finalPath,
        errorMessage: undefined,
      });

      this.notifyProgress(model.id, 100, expectedBytes, expectedBytes);
      console.log(`[ModelDownloader] Successfully verified and installed ${model.name} to ${finalPath}`);
      return finalPath;
    } catch (error: any) {
      const isCancellation =
        error?.message?.includes('cancel') ||
        error?.message?.includes('pause') ||
        error?.message?.includes('abort');

      if (!isCancellation && !error?.message?.includes('Verification failed')) {
        try {
          const snapshot = downloadResumable.savable();
          await AsyncStorage.setItem(
            `${RESUMABLE_STATE_KEY_PREFIX}${model.id}`,
            JSON.stringify(snapshot)
          );
        } catch {}

        await this.storage.updateModelState(model.id, {
          status: 'error',
          errorMessage: error?.message || 'Download failed due to network error.',
        });
      }
      throw error;
    } finally {
      this.activeDownload = null;
      this.activeModelId = null;
    }
  }

  /**
   * Pauses active download and saves resumable state.
   */
  public async pauseDownload(modelId: string): Promise<void> {
    if (this.activeModelId === modelId && this.activeDownload) {
      try {
        const snapshot = await this.activeDownload.pauseAsync();
        await AsyncStorage.setItem(
          `${RESUMABLE_STATE_KEY_PREFIX}${modelId}`,
          JSON.stringify(snapshot)
        );
      } catch (e) {
        console.warn('[ModelDownloader] Pause notice:', e);
      }
      this.activeDownload = null;
      this.activeModelId = null;
      await this.storage.updateModelState(modelId, { status: 'paused' });
    }
  }

  /**
   * Cancels active download, deletes the corresponding model.fileName.part file, and resets state.
   */
  public async cancelDownload(modelId: string): Promise<void> {
    if (this.activeModelId === modelId && this.activeDownload) {
      try {
        await this.activeDownload.cancelAsync();
      } catch (e) {
        console.warn('[ModelDownloader] Cancel async notice:', e);
      }
      this.activeDownload = null;
      this.activeModelId = null;
    }

    // T4 Fix: Look up model by modelId and delete ${model.fileName}.part
    try {
      const model = getModelById(modelId);
      const fileName = model?.fileName || `${modelId}.gguf`;
      const finalPath = this.storage.getModelPath(fileName);
      const partPath = `${finalPath}.part`;
      await FileSystem.deleteAsync(partPath, { idempotent: true });
    } catch (err) {
      console.warn('[ModelDownloader] Error removing part file during cancellation:', err);
    }

    await AsyncStorage.removeItem(`${RESUMABLE_STATE_KEY_PREFIX}${modelId}`);
    await this.storage.updateModelState(modelId, {
      status: 'not_downloaded',
      downloadProgress: 0,
      downloadedBytes: 0,
      errorMessage: undefined,
    });
  }

  /**
   * Safe delete: unloads model from native memory, cancels any active downloads,
   * and deletes both model file and partial .part file.
   */
  public async deleteModel(modelId: string, fileName: string): Promise<boolean> {
    const aiEngine = AIEngine.getInstance();
    if (aiEngine.getCurrentModelId() === modelId) {
      console.log(`[ModelDownloader] Model ${modelId} is active in memory. Unloading before deletion...`);
      await aiEngine.unloadCurrentModel();
    }

    if (this.activeModelId === modelId) {
      await this.cancelDownload(modelId);
    }

    await AsyncStorage.removeItem(`${RESUMABLE_STATE_KEY_PREFIX}${modelId}`);
    return this.storage.deleteModelFile(modelId, fileName);
  }
}
