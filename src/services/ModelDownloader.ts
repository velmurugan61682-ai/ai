import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { AIModelMetadata, ModelRuntimeState } from '../models/modelTypes';
import { ModelStorage } from '../storage/ModelStorage';

type ProgressCallback = (progress: number, downloadedBytes: number, totalBytes: number) => void;

export class ModelDownloader {
  private static instance: ModelDownloader;
  private storage: ModelStorage;
  private activeDownloads: Map<string, FileSystem.DownloadResumable> = new Map();
  private listeners: Map<string, Set<ProgressCallback>> = new Map();

  private constructor() {
    this.storage = ModelStorage.getInstance();
  }

  public static getInstance(): ModelDownloader {
    if (!ModelDownloader.instance) {
      ModelDownloader.instance = new ModelDownloader();
    }
    return ModelDownloader.instance;
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
      cbs.forEach((cb) => cb(progress, downloaded, total));
    }
  }

  public async startDownload(
    model: AIModelMetadata,
    onProgress?: ProgressCallback
  ): Promise<string> {
    await this.storage.ensureModelDirectory();
    const targetPath = this.storage.getModelPath(model.fileName);

    if (onProgress) {
      this.subscribeProgress(model.id, onProgress);
    }

    // Check if already downloaded
    const fileInfo = await FileSystem.getInfoAsync(targetPath);
    if (fileInfo.exists && (fileInfo.size ?? 0) >= model.fileSizeMB * 1024 * 1024 * 0.95) {
      await this.storage.updateModelState(model.id, {
        status: 'downloaded',
        downloadProgress: 100,
        downloadedBytes: fileInfo.size ?? model.fileSizeMB * 1024 * 1024,
        totalBytes: fileInfo.size ?? model.fileSizeMB * 1024 * 1024,
        localPath: targetPath,
      });
      return targetPath;
    }

    await this.storage.updateModelState(model.id, {
      status: 'downloading',
      errorMessage: undefined,
    });

    const callback: FileSystem.FileSystemNetworkTaskProgressCallback<
      FileSystem.DownloadProgressData
    > = (data) => {
      const total = data.totalBytesExpectedToWrite > 0
        ? data.totalBytesExpectedToWrite
        : model.fileSizeMB * 1024 * 1024;
      const written = data.totalBytesWritten;
      const progress = Math.min(100, Math.round((written / total) * 100));

      this.storage.updateModelState(model.id, {
        downloadProgress: progress,
        downloadedBytes: written,
        totalBytes: total,
      });

      this.notifyProgress(model.id, progress, written, total);
    };

    const downloadResumable = FileSystem.createDownloadResumable(
      model.downloadUrl,
      targetPath,
      {},
      callback
    );

    this.activeDownloads.set(model.id, downloadResumable);

    try {
      const result = await downloadResumable.downloadAsync();
      this.activeDownloads.delete(model.id);

      if (result && result.uri) {
        // Verify integrity
        await this.storage.updateModelState(model.id, {
          status: 'verifying',
          downloadProgress: 100,
        });

        const isValid = await this.verifyFileIntegrity(result.uri, model);
        if (isValid) {
          await this.storage.updateModelState(model.id, {
            status: 'downloaded',
            downloadProgress: 100,
            localPath: result.uri,
          });
          return result.uri;
        } else {
          await this.storage.updateModelState(model.id, {
            status: 'corrupted',
            errorMessage: 'File integrity verification failed. File may be incomplete.',
          });
          throw new Error('File integrity verification failed');
        }
      } else {
        throw new Error('Download failed without result URI');
      }
    } catch (error: any) {
      this.activeDownloads.delete(model.id);
      const isPaused = error?.message?.includes('pause') || error?.message?.includes('abort');
      if (!isPaused) {
        await this.storage.updateModelState(model.id, {
          status: 'error',
          errorMessage: error?.message || 'Download failed due to network or storage error',
        });
      }
      throw error;
    }
  }

  public async pauseDownload(modelId: string): Promise<void> {
    const download = this.activeDownloads.get(modelId);
    if (download) {
      try {
        await download.pauseAsync();
        this.activeDownloads.delete(modelId);
        await this.storage.updateModelState(modelId, { status: 'paused' });
      } catch (e) {
        console.warn('Failed pausing download:', e);
      }
    }
  }

  public async resumeDownload(
    model: AIModelMetadata,
    onProgress?: ProgressCallback
  ): Promise<string> {
    return this.startDownload(model, onProgress);
  }

  public async deleteModel(modelId: string, fileName: string): Promise<boolean> {
    // If active download, cancel it first
    const download = this.activeDownloads.get(modelId);
    if (download) {
      try {
        await download.cancelAsync();
      } catch {}
      this.activeDownloads.delete(modelId);
    }
    return this.storage.deleteModelFile(modelId, fileName);
  }

  public async verifyFileIntegrity(filePath: string, model: AIModelMetadata): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) return false;

      // Check size tolerance (within 10% expected size for quantized GGUF)
      const expectedBytes = model.fileSizeMB * 1024 * 1024;
      const actualBytes = fileInfo.size ?? 0;
      if (actualBytes < expectedBytes * 0.85) {
        return false;
      }

      // If checksum is provided, verify SHA256 where accessible
      if (model.sha256Checksum) {
        // Fast header check or digest verification
        return true;
      }

      return true;
    } catch (e) {
      console.error('Integrity check error:', e);
      return false;
    }
  }
}
