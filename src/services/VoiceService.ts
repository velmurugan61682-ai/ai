import { Platform, PermissionsAndroid } from 'react-native';
import { SUPPORTED_LANGUAGES, LanguageInfo } from './LanguageService';

export interface VoiceRecognitionOptions {
  language?: string; // BCP-47 locale e.g. 'ta-IN', 'en-IN', 'hi-IN'
  continuous?: boolean;
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

// Dynamically reference native speech module if linked
let ExpoSpeechRecognitionModule: any = null;
if (Platform.OS !== 'web') {
  try {
    const pkg = require('expo-speech-recognition');
    ExpoSpeechRecognitionModule = pkg.ExpoSpeechRecognitionModule || pkg.default;
  } catch (e) {
    // If expo-speech-recognition is not natively compiled in this binary
  }
}

export class VoiceService {
  private static instance: VoiceService;
  private isListening = false;
  private currentLanguage: LanguageInfo = SUPPORTED_LANGUAGES[0]; // en-IN default
  private webRecognition: any = null;
  private nativeListenerSubscription: any = null;

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

  /**
   * Requests Android RECORD_AUDIO runtime permission.
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'SaaS AI Brain needs access to your microphone for English and Tamil voice recognition.',
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
    return true;
  }

  /**
   * Starts listening to user voice and streams recognized text in real time.
   * Supports en-IN and ta-IN natively on Android.
   */
  public async startListening(options: VoiceRecognitionOptions): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      options.onError?.('Microphone permission was denied. Please allow audio recording in device settings.');
      return;
    }

    // Default locale: en-IN or ta-IN
    const bcp47 = options.language || this.currentLanguage.bcp47 || 'en-IN';

    // 1. Native Android with ExpoSpeechRecognitionModule (if linked)
    if (Platform.OS === 'android' && ExpoSpeechRecognitionModule) {
      try {
        if (typeof ExpoSpeechRecognitionModule.requestPermissionsAsync === 'function') {
          const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (!perm.granted) {
            options.onError?.('Microphone permission denied by Android system.');
            return;
          }
        }

        this.isListening = true;
        options.onStart?.();

        if (typeof ExpoSpeechRecognitionModule.start === 'function') {
          ExpoSpeechRecognitionModule.start({
            lang: bcp47,
            interimResults: true,
            continuous: options.continuous ?? false,
          });
        }
        return;
      } catch (nativeErr: any) {
        console.warn('[VoiceService] Native STT error, falling back:', nativeErr);
      }
    }

    // 2. Web / Chrome / Safari / WebView implementation
    if (Platform.OS === 'web' || (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))) {
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
          options.onError?.(
            'Speech recognition is not supported in this browser. Please use Chrome or an Android device.'
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
            message = 'Network connectivity required for cloud speech recognition fallback.';
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

    // If native speech engine isn't compiled into the current development build
    this.isListening = false;
    options.onError?.(
      'Native speech recognizer is initializing. If running in an emulator without a physical microphone, please type your message.'
    );
  }

  public async stopListening(): Promise<void> {
    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (e) {}
      this.webRecognition = null;
    }
    if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.stop === 'function') {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (e) {}
    }
    this.isListening = false;
  }

  public async cancelListening(): Promise<void> {
    if (this.webRecognition) {
      try {
        this.webRecognition.abort();
      } catch (e) {}
      this.webRecognition = null;
    }
    if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.abort === 'function') {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch (e) {}
    }
    this.isListening = false;
  }
}
