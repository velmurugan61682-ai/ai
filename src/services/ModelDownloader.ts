import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { AIModelMetadata, ModelRuntimeState } from '../models/modelTypes';
import { ModelStorage } from '../storage/ModelStorage';
import { AIEngine } from '../brain/AIEngine';

export type ProgressCallback = (progress: number, downloadedBytes: number, totalBytes: number) => void;
export type CellularConfirmHandler = (model: AIModelMetadata) => Promise<boolean>;

const RESUMABLE_STATE_KEY_PREFIX = '@saas_ai_brain_resumable_v1_';

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
   * Starts or resumes verified resumable download for a model into documentDirectory/models/
   * Writes to <file>.part, verifies exact byte size on completion, then atomically moves to final file.
   */
  public async startDownload(
    model: AIModelMetadata,
    onProgress?: ProgressCallback,
    skipCellularCheck = false
  ): Promise<string> {
    if (Platform.OS === 'web') {
      throw new Error('On-device AI model downloading is supported on Android only.');
    }

    if (onProgress) {
      this.subscribeProgress(model.id, onProgress);
    }

    // 1. Mutex: Only ONE download at a time
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

    // 2. Check if valid file already exists (NEVER re-download valid existing file)
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
          `[ModelDownloader] Existing file for ${model.name} is corrupted (${existingFileInfo.size} vs ${expectedBytes} B). Removing.`
        );
        await FileSystem.deleteAsync(finalPath, { idempotent: true });
      }
    }

    // 3. Free Disk Space Check before starting
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

    // 4. Network Connectivity & Cellular Check
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

    // 5. Initialize Resumable Download
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

    // Check for saved resumable state
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

      // Check if cancelled/aborted
      if (!result || !result.uri) {
        throw new Error('Download terminated without output URI.');
      }

      // 6. Verification: Check byte size of the downloaded .part file
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

      // Verify file size equals expected
      if (actualBytes !== expectedBytes) {
        await FileSystem.deleteAsync(partPath, { idempotent: true });
        await AsyncStorage.removeItem(`${RESUMABLE_STATE_KEY_PREFIX}${model.id}`);
        const mismatchError = `Verification failed: File size mismatch (received ${actualBytes} bytes, expected ${expectedBytes} bytes). Corrupt partial removed.`;
        await this.storage.updateModelState(model.id, {
          status: 'corrupted',
          errorMessage: mismatchError,
          downloadProgress: 0,
        });
        throw new Error(mismatchError);
      }

      // 7. Atomic Rename: move from .part to final destination
      await FileSystem.moveAsync({
        from: partPath,
        to: finalPath,
      });

      // Clear saved snapshot
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
        // Save resumable snapshot if available for resume
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
   * Cancels active download, cleans up .part file, and resets state.
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

    // Clean up .part file
    try {
      const finalPath = this.storage.getModelPath(`${modelId}.gguf`);
      const partPath = `${finalPath}.part`;
      await FileSystem.deleteAsync(partPath, { idempotent: true });
    } catch {}

    await AsyncStorage.removeItem(`${RESUMABLE_STATE_KEY_PREFIX}${modelId}`);
    await this.storage.updateModelState(modelId, {
      status: 'not_downloaded',
      downloadProgress: 0,
      downloadedBytes: 0,
      errorMessage: undefined,
    });
  }

  /**
   * Safe delete:
   * 1. If model is currently loaded in AIEngine, unload/release native context first.
   * 2. Cancel any running download for this model.
   * 3. Delete <file>.gguf and <file>.gguf.part from disk.
   * 4. Clear storage & selection states.
   */
  public async deleteModel(modelId: string, fileName: string): Promise<boolean> {
    // 1. Unload if active in memory
    const aiEngine = AIEngine.getInstance();
    if (aiEngine.getCurrentModelId() === modelId) {
      console.log(`[ModelDownloader] Model ${modelId} is active in memory. Unloading before deletion...`);
      await aiEngine.unloadCurrentModel();
    }

    // 2. Cancel download if active
    if (this.activeModelId === modelId) {
      await this.cancelDownload(modelId);
    }

    // 3. Delete file and partial
    await AsyncStorage.removeItem(`${RESUMABLE_STATE_KEY_PREFIX}${modelId}`);
    return this.storage.deleteModelFile(modelId, fileName);
  }
}
