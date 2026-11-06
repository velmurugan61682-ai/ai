import { Platform } from 'react-native';
import { ITiyoBrain, TiyoMessage, TiyoModelStatus, TiyoResponse } from './types';
import { getModelById } from '../models/modelRegistry';
import { ModelStorage } from '../storage/ModelStorage';
import { ModelDownloader } from '../services/ModelDownloader';
import { AIEngine } from '../brain/AIEngine';
import { buildTiyoPrompt, TIYO_GBNF_GRAMMAR } from './tiyoPrompt';
import { parseTiyoResponse } from './actionValidator';
import { stripThinkingTags, ThinkingStreamFilter, QWEN_STOP_STRINGS } from '../brain/PromptEngine';

export class AndroidTiyoBrain implements ITiyoBrain {
  private static instance: AndroidTiyoBrain;
  private status: TiyoModelStatus = 'not_downloaded';
  private statusMessage: string = 'Model not downloaded';
  private downloadProgress: number = 0;
  private modelId: string = 'qwen3-0.6b';
  private storage: ModelStorage;
  private downloader: ModelDownloader;
  private aiEngine: AIEngine;

  private constructor() {
    this.storage = ModelStorage.getInstance();
    this.downloader = ModelDownloader.getInstance();
    this.aiEngine = AIEngine.getInstance();
    this.checkInitialStatus();
  }

  public static getInstance(): AndroidTiyoBrain {
    if (!AndroidTiyoBrain.instance) {
      AndroidTiyoBrain.instance = new AndroidTiyoBrain();
    }
    return AndroidTiyoBrain.instance;
  }

  public getStatus(): TiyoModelStatus {
    return this.status;
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public getDownloadProgress(): number {
    return this.downloadProgress;
  }

  public async checkInitialStatus(): Promise<void> {
    try {
      const modelMeta = getModelById(this.modelId);
      if (!modelMeta) {
        this.status = 'error';
        this.statusMessage = 'Model metadata not found in registry';
        return;
      }

      const isPresent = await this.storage.isModelFilePresent(modelMeta.fileName);
      if (!isPresent) {
        this.status = 'not_downloaded';
        this.statusMessage = 'Model not downloaded (tap "Download Model")';
        this.downloadProgress = 0;
      } else {
        if (this.aiEngine.isModelLoaded() && this.aiEngine.getCurrentModelId() === this.modelId) {
          this.status = 'ready';
          this.statusMessage = 'Running locally on device (GPU/CPU)';
        } else {
          this.status = 'not_downloaded'; // Model on disk, needs loading
          this.statusMessage = 'Model downloaded. Tap to load into memory.';
        }
      }
    } catch (e: any) {
      this.status = 'error';
      this.statusMessage = `Storage check failed: ${e?.message || e}`;
    }
  }

  public async downloadModel(
    onProgress?: (progress: number, downloaded: number, total: number) => void
  ): Promise<void> {
    const modelMeta = getModelById(this.modelId);
    if (!modelMeta) {
      this.status = 'error';
      this.statusMessage = 'Qwen3 model metadata missing';
      throw new Error(this.statusMessage);
    }

    this.status = 'downloading';
    this.statusMessage = 'Downloading Qwen3-0.6B-Q8_0 GGUF (639 MB)...';
    this.downloadProgress = 0;

    try {
      await this.downloader.startDownload(
        modelMeta,
        (progress, downloaded, total) => {
          this.downloadProgress = Math.min(100, Math.max(0, Math.round(progress)));
          this.statusMessage = `Downloading: ${this.downloadProgress}% (${(downloaded / (1024 * 1024)).toFixed(1)} / ${(total / (1024 * 1024)).toFixed(1)} MB)`;
          if (onProgress) {
            onProgress(progress, downloaded, total);
          }
        },
        true // Explicit download triggered by user tap
      );

      this.statusMessage = 'Download complete. Loading model into device memory...';
      await this.loadModel();
    } catch (err: any) {
      this.status = 'error';
      this.statusMessage = `Download failed: ${err?.message || err}`;
      throw err;
    }
  }

  public async loadModel(): Promise<void> {
    const modelMeta = getModelById(this.modelId);
    if (!modelMeta) {
      this.status = 'error';
      this.statusMessage = 'Model metadata not found';
      throw new Error(this.statusMessage);
    }

    this.status = 'loading';
    this.statusMessage = 'Loading Qwen3 into device memory...';

    try {
      const modelPath = this.storage.getModelPath(modelMeta.fileName);
      await this.aiEngine.loadModel(this.modelId, modelPath);
      this.status = 'ready';
      this.statusMessage = 'Running locally on device';
    } catch (err: any) {
      this.status = 'error';
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('out of memory') || msg.toLowerCase().includes('oom')) {
        this.statusMessage = 'Error: Insufficient device RAM to load 640MB model.';
      } else {
        this.statusMessage = `Load failed: ${msg}`;
      }
      throw err;
    }
  }

  public async generateReply(
    userPrompt: string,
    conversationHistory: TiyoMessage[] = [],
    onToken?: (token: string) => void
  ): Promise<TiyoResponse> {
    if (this.status !== 'ready') {
      // Attempt load if already downloaded
      const modelMeta = getModelById(this.modelId);
      const isPresent = modelMeta ? await this.storage.isModelFilePresent(modelMeta.fileName) : false;
      if (isPresent) {
        await this.loadModel();
      } else {
        throw new Error('Model is not ready. Please download Qwen3 model first.');
      }
    }

    const promptText = buildTiyoPrompt(conversationHistory, userPrompt);
    let fullRawOutput = '';

    const thinkFilter = new ThinkingStreamFilter((filteredToken) => {
      fullRawOutput += filteredToken;
      if (onToken) onToken(filteredToken);
    });

    try {
      // Access underlying llama context directly to enable grammar constraints
      const context = (this.aiEngine as any).currentContext;
      if (context && typeof context.completion === 'function') {
        let result: any = null;

        // Try with GBNF grammar constrained decoding
        try {
          result = await context.completion(
            {
              prompt: promptText,
              n_predict: 256,
              temperature: 0.7,
              top_p: 0.9,
              grammar: TIYO_GBNF_GRAMMAR,
              stop: QWEN_STOP_STRINGS,
            },
            (data: { token: string }) => {
              if (data?.token) {
                thinkFilter.processToken(data.token);
              }
            }
          );
        } catch (grammarErr) {
          console.warn('[AndroidTiyoBrain] GBNF grammar decoding fallback to standard completion:', grammarErr);
          fullRawOutput = '';
          result = await context.completion(
            {
              prompt: promptText,
              n_predict: 256,
              temperature: 0.7,
              top_p: 0.9,
              stop: QWEN_STOP_STRINGS,
            },
            (data: { token: string }) => {
              if (data?.token) {
                thinkFilter.processToken(data.token);
              }
            }
          );
        }

        thinkFilter.flush();
        const outputText = result?.text || fullRawOutput;
        const cleanText = stripThinkingTags(outputText)
          .replace(/<\|im_end\|>/g, '')
          .replace(/<\|endoftext\|>/g, '')
          .trim();

        return parseTiyoResponse(cleanText);
      } else {
        throw new Error('Native llama.rn inference context is not active.');
      }
    } catch (err: any) {
      console.error('[AndroidTiyoBrain] Inference error:', err);
      throw err;
    }
  }
}
