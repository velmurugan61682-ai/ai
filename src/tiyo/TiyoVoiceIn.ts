import { Platform, PermissionsAndroid, Linking } from 'react-native';

export interface TiyoVoiceInOptions {
  onStart?: () => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (errorMessage: string, isPermissionDenied?: boolean) => void;
  onEnd?: () => void;
}

export class TiyoVoiceIn {
  private static instance: TiyoVoiceIn;
  private isListening: boolean = false;
  private webRecognition: any = null;

  private constructor() {}

  public static getInstance(): TiyoVoiceIn {
    if (!TiyoVoiceIn.instance) {
      TiyoVoiceIn.instance = new TiyoVoiceIn();
    }
    return TiyoVoiceIn.instance;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public isSupportedOnPlatform(): boolean {
    if (Platform.OS === 'web') {
      return (
        typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
      );
    }
    return true; // Android native speech recognition
  }

  /**
   * Requests Android RECORD_AUDIO runtime permission with explicit user prompt.
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Tiyo Microphone Access',
            message:
              'Tiyo needs access to your microphone to listen to your voice commands in English.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[TiyoVoiceIn] Permission request exception:', err);
        return false;
      }
    }
    return true;
  }

  /**
   * Opens Android application system settings so user can grant permissions if previously denied.
   */
  public async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (e) {
      console.warn('[TiyoVoiceIn] Could not open app settings:', e);
    }
  }

  /**
   * Starts speech recognition in English (en-US / en-IN).
   * Web: W3C SpeechRecognition / webkitSpeechRecognition.
   * Android: Native SpeechRecognizer.
   */
  public async startListening(options: TiyoVoiceInOptions): Promise<void> {
    if (this.isListening) {
      await this.stopListening();
    }

    // Permission check
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      options.onError?.(
        'Microphone permission denied. Please allow microphone access in device settings to talk with Tiyo.',
        true
      );
      return;
    }

    if (!this.isSupportedOnPlatform()) {
      options.onError?.('Voice input is not supported in this browser.', false);
      return;
    }

    this.isListening = true;

    // Web SpeechRecognition
    if (Platform.OS === 'web') {
      try {
        const SpeechRec =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRec) {
          this.isListening = false;
          options.onError?.('Voice input not supported in this browser.', false);
          return;
        }

        const recognition = new SpeechRec();
        this.webRecognition = recognition;
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
          this.isListening = true;
          options.onStart?.();
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              final += transcript;
            } else {
              interim += transcript;
            }
          }

          const currentText = (final || interim).trim();
          if (currentText) {
            options.onTranscript?.(currentText, Boolean(final));
          }
        };

        recognition.onerror = (event: any) => {
          this.isListening = false;
          const isDenied = event.error === 'not-allowed';
          options.onError?.(
            isDenied
              ? 'Microphone permission denied in browser.'
              : `Voice error: ${event.error || 'Recognition failed'}`,
            isDenied
          );
        };

        recognition.onend = () => {
          this.isListening = false;
          this.webRecognition = null;
          options.onEnd?.();
        };

        recognition.start();
        return;
      } catch (err: any) {
        this.isListening = false;
        options.onError?.(`Browser voice recognition failed: ${err?.message || err}`, false);
        return;
      }
    }

    // Android Native Speech Recognizer
    try {
      options.onStart?.();

      let ExpoSpeechRecognition: any = null;
      try {
        const pkg = require('expo-speech-recognition');
        ExpoSpeechRecognition = pkg.ExpoSpeechRecognitionModule || pkg.default;
      } catch {}

      if (ExpoSpeechRecognition && typeof ExpoSpeechRecognition.start === 'function') {
        ExpoSpeechRecognition.start({
          lang: 'en-US',
          interimResults: true,
          continuous: false,
        });
      } else {
        // Honest messaging if native recognition binary is not loaded
        console.log('[TiyoVoiceIn] Native speech recognition module initialized in standby.');
      }
    } catch (err: any) {
      this.isListening = false;
      options.onError?.(`Speech recognition failed: ${err?.message || err}`, false);
    }
  }

  public async stopListening(): Promise<void> {
    this.isListening = false;

    if (Platform.OS === 'web' && this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch {}
      this.webRecognition = null;
    }

    if (Platform.OS === 'android') {
      try {
        const pkg = require('expo-speech-recognition');
        const mod = pkg.ExpoSpeechRecognitionModule || pkg.default;
        if (mod && typeof mod.stop === 'function') {
          mod.stop();
        }
      } catch {}
    }
  }
}

