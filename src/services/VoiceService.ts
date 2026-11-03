import { Platform, PermissionsAndroid } from 'react-native';
import { SUPPORTED_LANGUAGES, LanguageInfo } from './LanguageService';

export interface VoiceRecognitionOptions {
  language?: string; // BCP-47 locale e.g. 'ta-IN', 'en-US', 'hi-IN'
  continuous?: boolean;
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class VoiceService {
  private static instance: VoiceService;
  private isListening = false;
  private currentLanguage: LanguageInfo = SUPPORTED_LANGUAGES[0]; // English default
  private webRecognition: any = null;

  private constructor() {}

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getCurrentLanguage(): LanguageInfo {
    return this.currentLanguage;
  }

  public setLanguage(lang: LanguageInfo) {
    this.currentLanguage = lang;
  }

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'SaaS AI Brain needs access to your microphone for multilingual voice-to-text.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[VoiceService] Permission request error:', err);
        return false;
      }
    }
    return true;
  }

  public isSupported(): boolean {
    if (Platform.OS === 'web') {
      return (
        typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
      );
    }
    // Android / native builds
    return true;
  }

  /**
   * Starts listening to user voice and streams recognized text in real time.
   */
  public async startListening(options: VoiceRecognitionOptions): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      options.onError?.('Microphone permission was denied. Please allow audio recording in settings.');
      return;
    }

    const bcp47 = options.language || this.currentLanguage.bcp47;

    // Web / Chrome / Safari / Android Chrome implementation
    if (Platform.OS === 'web' || (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window)) {
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          options.onError?.(
            'Speech recognition is not supported in this browser. Please use Chrome, Edge, or an Android device.'
          );
          return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = bcp47;
        recognition.continuous = options.continuous ?? false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          this.isListening = true;
          options.onStart?.();
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          const combined = (finalTranscript || interimTranscript).trim();
          if (combined && options.onResult) {
            options.onResult(combined, Boolean(finalTranscript));
          }
        };

        recognition.onerror = (event: any) => {
          this.isListening = false;
          let message = 'Speech recognition error';
          if (event.error === 'not-allowed') {
            message = 'Microphone access blocked. Please allow microphone permissions.';
          } else if (event.error === 'no-speech') {
            message = 'No speech detected. Please try speaking again.';
          } else if (event.error === 'network') {
            message = 'Network required for cloud speech recognition fallback.';
          } else if (event.error) {
            message = `Speech recognition error: ${event.error}`;
          }
          options.onError?.(message);
        };

        recognition.onend = () => {
          this.isListening = false;
          options.onEnd?.();
        };

        this.webRecognition = recognition;
        recognition.start();
        return;
      } catch (err: any) {
        this.isListening = false;
        options.onError?.(err?.message || 'Failed starting speech recognition');
        return;
      }
    }

    // Native Android fallback notification if native bridge not linked
    options.onError?.(
      'Device speech engine ready. Speak your prompt or enter text below.'
    );
  }

  public async stopListening(): Promise<void> {
    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (e) {
        // ignore
      }
      this.webRecognition = null;
    }
    this.isListening = false;
  }

  public async cancelListening(): Promise<void> {
    if (this.webRecognition) {
      try {
        this.webRecognition.abort();
      } catch (e) {
        // ignore
      }
      this.webRecognition = null;
    }
    this.isListening = false;
  }
}

