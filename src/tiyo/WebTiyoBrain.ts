import { ITiyoBrain, TiyoMessage, TiyoModelStatus, TiyoResponse } from './types';
import { parseTiyoResponse } from './actionValidator';
import { buildTiyoPrompt } from './tiyoPrompt';

export class WebTiyoBrain implements ITiyoBrain {
  private static instance: WebTiyoBrain;
  private status: TiyoModelStatus = 'ready';
  private statusMessage: string = 'AI not connected';
  private serverUrl: string | null = null;

  private constructor() {
    // Check if optional self-hosted llama server proxy is provided via environment
    const configuredUrl =
      typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_LLAMA_SERVER_URL
        ? process.env.EXPO_PUBLIC_LLAMA_SERVER_URL
        : null;

    if (configuredUrl) {
      this.serverUrl = configuredUrl;
      this.status = 'ready';
      this.statusMessage = 'Running on server';
    } else {
      this.serverUrl = null;
      this.status = 'ready';
      this.statusMessage = 'AI not connected';
    }
  }

  public static getInstance(): WebTiyoBrain {
    if (!WebTiyoBrain.instance) {
      WebTiyoBrain.instance = new WebTiyoBrain();
    }
    return WebTiyoBrain.instance;
  }

  public getStatus(): TiyoModelStatus {
    return this.status;
  }

  public getStatusMessage(): string {
    return this.statusMessage;
  }

  public getDownloadProgress(): number {
    return 100;
  }

  public async downloadModel(): Promise<void> {
    // Web does not download 640MB weights to browser memory
    return Promise.resolve();
  }

  public async loadModel(): Promise<void> {
    return Promise.resolve();
  }

  public async generateReply(
    userPrompt: string,
    conversationHistory: TiyoMessage[] = [],
    onToken?: (token: string) => void
  ): Promise<TiyoResponse> {
    // If self-hosted llama server proxy is configured, call it
    if (this.serverUrl) {
      try {
        const promptText = buildTiyoPrompt(conversationHistory, userPrompt);
        const res = await fetch(`${this.serverUrl}/v1/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            max_tokens: 256,
            temperature: 0.7,
            stop: ['<|im_end|>', '<|endoftext|>'],
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        const text = data?.choices?.[0]?.text || '';
        if (onToken) onToken(text);
        return parseTiyoResponse(text);
      } catch (err: any) {
        console.warn('[WebTiyoBrain] Server request failed:', err);
        throw new Error(`Server connection failed: ${err?.message || err}`);
      }
    }

    // Truthful Web Mode when AI not connected:
    // Inform the user honestly without canned replies pretending to be AI
    const honestNotice =
      "I am Tiyo, your robot assistant. My on-device Qwen AI brain runs offline natively on Android. On the website, please run the Android app or configure a local llama server to enable live neural inference.";

    for (const char of honestNotice) {
      if (onToken) onToken(char);
      await new Promise((r) => setTimeout(r, 8));
    }

    return {
      response: honestNotice,
      action: 'idle',
      emotion: 'neutral',
      rawText: honestNotice,
    };
  }
}

