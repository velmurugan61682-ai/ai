import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { LanguageService } from './LanguageService';

export type TTSState = 'idle' | 'speaking' | 'paused';

export interface TTSOptions {
  rate?: number; // 0.75, 1.0, 1.25, 1.5
  pitch?: number;
  language?: string; // BCP-47 e.g. 'ta-IN', 'hi-IN', 'en-US'
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: any) => void;
}

export class TTSService {
  private static instance: TTSService;
  private state: TTSState = 'idle';
  private currentSpeakingId: string | null = null;
  private languageService: LanguageService;

  private constructor() {
    this.languageService = LanguageService.getInstance();
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  public getState(): TTSState {
    return this.state;
  }

  public getCurrentSpeakingId(): string | null {
    return this.currentSpeakingId;
  }

  public isSpeaking(): boolean {
    return this.state === 'speaking';
  }

  /**
   * Reads the given message aloud in an appropriate language voice.
   */
  public async speakMessage(
    id: string,
    rawText: string,
    options: TTSOptions = {}
  ): Promise<void> {
    // If currently speaking, stop previous utterance first
    await this.stop();

    const cleanText = this.languageService.cleanTextForTTS(rawText);
    if (!cleanText) return;

    this.currentSpeakingId = id;
    this.state = 'speaking';

    const detected = this.languageService.detectLanguage(cleanText);
    const bcp47 = options.language || detected.bcp47;
    const rate = options.rate || 1.0;

    // Web-specific SpeechSynthesis fallback for best browser reliability
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = bcp47;
        utterance.rate = rate;

        utterance.onstart = () => {
          this.state = 'speaking';
          options.onStart?.();
        };

        utterance.onend = () => {
          this.state = 'idle';
          this.currentSpeakingId = null;
          options.onDone?.();
        };

        utterance.onerror = (e) => {
          this.state = 'idle';
          this.currentSpeakingId = null;
          options.onError?.(e);
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (err) {
        console.warn('[TTSService] Web SpeechSynthesis error, falling back to expo-speech:', err);
      }
    }

    try {
      Speech.speak(cleanText, {
        language: bcp47,
        rate,
        pitch: options.pitch || 1.0,
        onStart: () => {
          this.state = 'speaking';
          options.onStart?.();
        },
        onDone: () => {
          this.state = 'idle';
          this.currentSpeakingId = null;
          options.onDone?.();
        },
        onStopped: () => {
          this.state = 'idle';
          this.currentSpeakingId = null;
          options.onStopped?.();
        },
        onError: (err) => {
          this.state = 'idle';
          this.currentSpeakingId = null;
          options.onError?.(err);
        },
      });
    } catch (e) {
      this.state = 'idle';
      this.currentSpeakingId = null;
      options.onError?.(e);
    }
  }

  public async pause(): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
      this.state = 'paused';
      return;
    }

    try {
      if (await Speech.isSpeakingAsync()) {
        await Speech.pause();
        this.state = 'paused';
      }
    } catch (e) {
      console.warn('[TTSService] pause not supported or failed:', e);
    }
  }

  public async resume(): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
      this.state = 'speaking';
      return;
    }

    try {
      await Speech.resume();
      this.state = 'speaking';
    } catch (e) {
      console.warn('[TTSService] resume failed:', e);
    }
  }

  public async stop(): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else {
      try {
        await Speech.stop();
      } catch (e) {
        // ignore
      }
    }
    this.state = 'idle';
    this.currentSpeakingId = null;
  }
}
