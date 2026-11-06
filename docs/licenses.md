# Third-Party Licenses & Open Source Attributions

This project respects open-source licensing. All packages, assets, and libraries used by **Tiyo** and the **SaaS AI Brain** application are listed below with their respective licenses and distribution permissions.

---

## 1. Core Runtime & Inference

| Package / Asset | Version | License | Redistribution / Commercial Use | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **react** | 18.3.1 | MIT | Allowed | UI rendering core |
| **react-native** | 0.76.6 | MIT | Allowed | Native Android framework |
| **expo** | ~52.0.49 | MIT | Allowed | React Native application platform |
| **llama.rn** | 0.12.3 | MIT | Allowed | Mobile on-device LLM inference bindings (llama.cpp) |
| **Qwen/Qwen3-0.6B-GGUF** | Q8_0 (639,446,688 bytes) | Apache 2.0 | Allowed | Offline edge LLM model |
| **expo-speech** | ~13.0.0 | MIT | Allowed | Text-to-Speech synthesis on Android and iOS |
| **lucide-react-native** | ^0.475.0 | ISC | Allowed | Clean modern iconography |
| **react-native-svg** | 15.8.0 | MIT | Allowed | Vector graphics rendering for 2D animated robot avatar |
| **@react-native-async-storage/async-storage** | 1.23.1 | MIT | Allowed | Persistent local key-value storage |
| **expo-file-system** | ~18.0.11 | MIT | Allowed | Secure sandboxed file system for model weights |
| **expo-crypto** | ~14.0.2 | MIT | Allowed | Cryptographic hashing & SHA-256 verification |

---

## 2. Audio & Speech Architecture Evaluation

### Text-To-Speech (TTS)
- **Android**: `expo-speech` (MIT) leveraging system Google TTS engine (en-US, en-IN). Lightweight, zero APK overhead.
- **Web**: Standard browser W3C `SpeechSynthesis` API. Native browser implementation, 0 KB bundle weight.
- **Piper Evaluation**: Piper is an offline neural TTS system using ONNX runtime. Evaluation shows Piper requires ~40-70 MB native ONNX runtime binaries + ~60 MB voice ONNX model per voice. Bundling Piper would double the APK download footprint and require an additional 120+ MB RAM alongside Qwen3-0.6B (which consumes ~640 MB RAM). On budget/mid-range Android devices with 2GB-3GB RAM, this introduces severe OOM risk. `expo-speech` with the platform's native TTS service is the optimal, low-footprint solution.

### Speech-To-Text (STT)
- **Android**: Native Android Speech Recognizer (`android.speech.SpeechRecognizer` via `expo-speech-recognition` or Android Intents). Fast, hardware-accelerated.
- **Web**: W3C `webkitSpeechRecognition` / `SpeechRecognition` API. Native browser support, 0 KB overhead. Falls back cleanly to message input with helpful status banner if browser lacks speech API.
- **Whisper.rn Evaluation**: `whisper.rn tiny.en` is an offline speech-to-text engine using Whisper ggml. It requires ~75 MB weights and ~150-200 MB RAM during audio transcription. Running Whisper concurrently with Qwen3-0.6B inference on 2GB RAM phones causes Android Low Memory Killer (LMK) to terminate background activities. Native platform recognition delivers instant, zero-memory-penalty transcription.

---

## 3. Robot Avatar Assets
- **Robot Avatar (2D Animated)**: Custom vector illustration built entirely with `react-native-svg` and React Native Animated/Reanimated primitives. 100% proprietary to this project, zero external copyrighted vector assets.
- **License**: MIT / Proprietary to Project Owner.

