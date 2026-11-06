import { Platform } from 'react-native';

let ExpoSpeech: any = null;
try {
  ExpoSpeech = require('expo-speech');
} catch {
  // Fallback for headless / Node test environments
}

export interface VoiceItem {
  identifier: string;
  name: string;
  quality?: string;
  language: string;
}

export interface TiyoVoiceOptions {
  rate?: number; // 0.5x to 1.5x
  pitch?: number; // 0.8 to 1.2
  voiceIdentifier?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (err: any) => void;
  onMouthMove?: (openRatio: number) => void; // 0 (closed) to 1 (wide open)
}

export class TiyoVoiceOut {
  private static instance: TiyoVoiceOut;
  private isSpeaking: boolean = false;
  private speedRate: number = 1.0; // 0.5x to 1.5x
  private mouthInterval: any = null;
  private availableVoices: VoiceItem[] = [];

  private constructor() {
    this.loadAvailableVoices();
  }

  public static getInstance(): TiyoVoiceOut {
    if (!TiyoVoiceOut.instance) {
      TiyoVoiceOut.instance = new TiyoVoiceOut();
    }
    return TiyoVoiceOut.instance;
  }

  public async loadAvailableVoices(): Promise<VoiceItem[]> {
    try {
      if (Platform.OS !== 'web' && ExpoSpeech?.getAvailableVoicesAsync) {
        const voices = await ExpoSpeech.getAvailableVoicesAsync();
        this.availableVoices = voices.filter(
          (v: VoiceItem) => v.language.startsWith('en') || v.language.includes('en-US') || v.language.includes('en-IN')
        );
      }
    } catch (e) {
      console.warn('[TiyoVoiceOut] Could not query native voices:', e);
    }
    return this.availableVoices;
  }

  public getAvailableVoices(): VoiceItem[] {
    return this.availableVoices;
  }

  public getSpeed(): number {
    return this.speedRate;
  }

  public setSpeed(rate: number): void {
    // Clamp between 0.5 and 1.5
    this.speedRate = Math.max(0.5, Math.min(1.5, parseFloat(rate.toFixed(2))));
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  /**
   * Starts mouth oscillation driven by speech start/end boundary with timed oscillation.
   */
  private startMouthOscillation(onMouthMove?: (openRatio: number) => void): void {
    this.stopMouthOscillation(onMouthMove);
    if (!onMouthMove) return;

    let phase = 0;
    this.mouthInterval = setInterval(() => {
      phase += 0.35;
      // Oscillate mouth between 0.2 and 1.0 with natural syllable variation
      const ratio = 0.6 + 0.4 * Math.sin(phase) * Math.cos(phase * 0.7);
      onMouthMove(Math.max(0.1, Math.min(1.0, ratio)));
    }, 70);
  }

  private stopMouthOscillation(onMouthMove?: (openRatio: number) => void): void {
    if (this.mouthInterval) {
      clearInterval(this.mouthInterval);
      this.mouthInterval = null;
    }
    if (onMouthMove) {
      onMouthMove(0); // closed / smile resting state
    }
  }

  /**
   * Cancels previous utterance immediately before starting new utterance.
   * Guarantees zero overlap.
   */
  public async stop(): Promise<void> {
    this.stopMouthOscillation();
    this.isSpeaking = false;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
      return;
    }

    try {
      if (ExpoSpeech?.stop) {
        await ExpoSpeech.stop();
      }
    } catch (e) {
      console.warn('[TiyoVoiceOut] Error stopping native speech:', e);
    }
  }

  /**
   * Speaks English reply with expo-speech (Android) or SpeechSynthesis (Web).
   */
  public async speak(
    text: string,
    options: TiyoVoiceOptions = {}
  ): Promise<void> {
    if (!text || typeof text !== 'string') return;

    // Clean text of any residual brackets, json fragments, or emojis for clean TTS
    const cleanSpeech = text
      .replace(/<[^>]*>/g, '')
      .replace(/[\{\}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanSpeech) return;

    // 1. Cancel previous utterance before a new one (no overlap)
    await this.stop();

    this.isSpeaking = true;
    const rate = options.rate ?? this.speedRate;

    // Start mouth animation
    this.startMouthOscillation(options.onMouthMove);

    // Web SpeechSynthesis path
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        utterance.lang = 'en-US';
        utterance.rate = rate;

        utterance.onstart = () => {
          this.isSpeaking = true;
          options.onStart?.();
        };

        utterance.onend = () => {
          this.isSpeaking = false;
          this.stopMouthOscillation(options.onMouthMove);
          options.onDone?.();
        };

        utterance.onerror = (e) => {
          this.isSpeaking = false;
          this.stopMouthOscillation(options.onMouthMove);
          options.onError?.(e);
        };

        window.speechSynthesis.speak(utterance);
        return;
      } catch (webErr) {
        console.warn('[TiyoVoiceOut] Web SpeechSynthesis failed, falling back:', webErr);
      }
    }

    // Android / Native Expo Speech path
    try {
      options.onStart?.();
      if (ExpoSpeech?.speak) {
        ExpoSpeech.speak(cleanSpeech, {
          language: 'en-US',
          rate,
          pitch: options.pitch ?? 1.0,
          voice: options.voiceIdentifier,
          onDone: () => {
            this.isSpeaking = false;
            this.stopMouthOscillation(options.onMouthMove);
            options.onDone?.();
          },
          onStopped: () => {
            this.isSpeaking = false;
            this.stopMouthOscillation(options.onMouthMove);
            options.onStopped?.();
          },
          onError: (err: any) => {
            this.isSpeaking = false;
            this.stopMouthOscillation(options.onMouthMove);
            options.onError?.(err);
          },
        });
      } else {
        // Fallback for non-native test environments
        setTimeout(() => {
          this.isSpeaking = false;
          this.stopMouthOscillation(options.onMouthMove);
          options.onDone?.();
        }, 100);
      }
    } catch (nativeErr) {
      this.isSpeaking = false;
      this.stopMouthOscillation(options.onMouthMove);
      options.onError?.(nativeErr);
    }
  }
}
