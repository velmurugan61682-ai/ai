# Phase 0 Architecture & Implementation Plan: Tiyo AI Robot Assistant

## 1. Executive Summary & Objective

The objective is to implement **Tiyo**, an English-speaking AI robot assistant, inside the existing **SaaS AI Brain** application on **Android** and **Web** (Vercel static web export). Tiyo is powered by real on-device Qwen inference (`Qwen3-0.6B-Q8_0.gguf`, 639,446,688 bytes), featuring:
1. **Real AI Inference**: Zero canned/faked responses. On Android, real `llama.rn` native execution. On Web, truthful runtime state indicators.
2. **Deterministic Action Engine**: Strict allowlisted actions (`greet`, `smile`, `wave`, `thumbs_up`, `goodbye`, `idle`) and emotions (`happy`, `neutral`, `curious`, `sad`, `excited`) with a robust client-side finite state machine.
3. **Voice Out (TTS)**: English speech synthesis (`en-US` / `en-IN`), rate adjustments (0.5x to 1.5x), instantaneous cancellation, and animated mouth synchronization.
4. **Voice In (STT)**: Microphone capture with runtime permission lifecycle, live speech transcription, and graceful web fallback.
5. **Interactive 2D Animated Avatar**: Built with `react-native-svg` and Animated primitives, rendering identically across Android and Web with full reduced-motion support.
6. **Independence**: Tiyo operates completely standalone with zero dependencies on Billzzy API, MongoDB, or Mongoose. Existing features (Tamil/Tanglish billing parser, language detection, device benchmarks, API keys) remain 100% intact and untouched.

---

## 2. Existing Repository Architecture Analysis

### A. Qwen Integration Pipeline
- **AIEngine (`src/brain/AIEngine.ts`)**:
  - Dynamically requires `llama.rn` on native Android platforms, avoiding web bundler crashes.
  - Manages native llama context lifecycle (`initLlama`, `release`).
  - Sets context window `n_ctx: 4096`, attempts GPU offloading (`n_gpu_layers: 99`) and gracefully falls back to CPU (`n_gpu_layers: 0`).
  - Implements `ThinkingStreamFilter` to remove `<think>...</think>` tags on the fly during generation.
- **ModelDownloader (`src/services/ModelDownloader.ts`)**:
  - Downloads GGUF files to `FileSystem.documentDirectory/models/`.
  - Supports resumable downloads, retry logic (3 attempts with exponential backoff), cellular connection checks, and byte length verification.
  - Validates cryptographic SHA-256 integrity against the registry before marking a model downloaded.
- **ModelRegistry (`src/models/modelRegistry.ts`)**:
  - Pinned to `qwen3-0.6b`:
    - Repo: `Qwen/Qwen3-0.6B-GGUF`
    - Filename: `Qwen3-0.6B-Q8_0.gguf`
    - Size: `639,446,688 bytes` (610 MB)
    - SHA-256: `18d608d38b934c86fc3f3a050157b2d4df8d12330de6d13af3ba201edd0e6539`
    - Context Window: `4096`
- **PromptEngine (`src/brain/PromptEngine.ts`)**:
  - Builds ChatML format (`<|im_start|>system\n/no_think\n...<|im_end|>`).
  - Manages token budget trimming (`trimConversationHistory`) using character-to-token ratio heuristics.
  - Defines stop tokens: `['<|im_end|>', '<|endoftext|>']`.

### B. App Entry Points & Navigation
- **Entry Point**: `App.tsx` controls screen routing using state-based navigation (`currentScreen: ScreenId`).
- **Screen Flow**: `Splash` -> `Welcome` -> `DeviceDetection` -> `BrainDashboard`.
- **Bottom Navigation**: Persistent tab bar on main screens (`Brain`, `Chat`, `Models`, `Testing`, `API Keys`, `Settings`).
- **Tiyo Integration**: A dedicated tab and screen (`Tiyo`) will be added to the navigation without removing or altering existing screens.

### C. Web Architecture & Compatibility
- Metro web bundler exports to a static bundle (`npx expo export --platform web`) written to `dist/`.
- Native modules (`llama.rn`, `react-native-safe-area-context` native code) are conditionally guarded by `Platform.OS !== 'web'`.
- Deployed to Vercel at `https://ai-mocha-two-35.vercel.app/`.

---

## 3. Web Inference Architecture Decision

We evaluated the three web inference options:

1. **Option (a): In-browser wllama / WebGPU GGUF**:
   - *Feasibility*: Requires downloading the complete 639.4 MB GGUF weights directly into client browser memory/IndexedDB on every visiting client. WebAssembly 32-bit address space limits often cause memory allocation failures for 640MB+ models. On mobile browsers and lower-end laptops, loading a 640MB model into WASM causes browser tab crashes (OOM). Additionally, Hugging Face CDN enforces strict CORS or rate limits on browser GET requests for large GGUF files.
2. **Option (b): Self-hosted llama.cpp server behind a proxy**:
   - *Feasibility*: Excellent when an active external GPU/CPU instance (e.g. RunPod, AWS EC2, or local llama-server) is deployed. However, Vercel is a serverless platform with a 250MB deployment ceiling and 10s execution timeouts; Vercel cannot run llama.cpp itself. If the external server is down or unconfigured, web requests fail.
3. **Option (c): Truthful "AI not connected" with optional server proxy**:
   - *Decision*: **Option (c) is chosen as the primary truthful web mode** (with seamless proxy connection support if `EXPO_PUBLIC_LLAMA_SERVER_URL` is provided).
   - *Justification*:
     - In adherence to **Rule 1 (No fake AI)**: We must never fake inference or show canned responses.
     - When running on the web without a pre-configured backend proxy, the UI explicitly and truthfully displays the label **"AI not connected"** and an explanatory note informing the user that native on-device offline inference is available on the Android app.
     - If the user or developer specifies a server proxy via environment variable, the web client seamlessly connects and displays **"Running on server"**.
     - Tiyo's full UI, 2D avatar animations, voice input (STT), voice output (TTS), speed controls, and state machine remain 100% operational on web.

---

## 4. Phase-by-Phase Roadmap

- **Phase 1: Tiyo Brain**:
  - Unified `ITiyoBrain` interface.
  - Native Android implementation using `AIEngine` + `llama.rn` with strict `/no_think` English system prompt.
  - Web implementation: Option (c) ("AI not connected" truthful state / optional server proxy).
  - JSON schema enforcement: `{"response": string, "action": string, "emotion": string}` with safe regex/fallback parsing that never crashes.
  - Download trigger: Initiated strictly when user taps "Download Model", utilizing `ModelDownloader`.
- **Phase 2: Action Engine**:
  - Strict allowlist validation:
    - Actions: `greet`, `smile`, `wave`, `thumbs_up`, `goodbye`, `idle`.
    - Emotions: `happy`, `neutral`, `curious`, `sad`, `excited`.
  - Finite state machine: `idle` -> `listening` -> `thinking` -> `speaking` -> `(gesture)` -> `idle`.
  - Auto-return to idle timers and hostile JSON mitigation.
- **Phase 3: Voice Out (TTS)**:
  - Android `expo-speech` with English voice selection (`en-US` or `en-IN`).
  - Web `SpeechSynthesis` with rate selection (0.5x to 1.5x).
  - Mouth oscillation animation driven by speech lifecycle events.
- **Phase 4: Voice In (STT)**:
  - Android microphone permission request and speech recognition.
  - Web `SpeechRecognition` / `webkitSpeechRecognition` with clean unsupported fallback.
  - Automatic dispatch to TiyoBrain on final transcript.
- **Phase 5: Robot Avatar**:
  - 2D SVG animated robot avatar with blinking, head movement, smiling, waving, thumbs-up, mouth speaking oscillation, listening pulse, and thinking animation.
  - Reduced-motion accessibility support.
- **Phase 6: UI Integration**:
  - Responsive Tiyo tab added to `App.tsx`.
  - Avatar display, conversation history, input bar, mic button, speech controls, and truthful runtime badge.
- **Phase 7: Android Build & Acceptance Verification**:
  - Build Android debug APK: `cd android && gradlew.bat assembleDebug`.
  - Measure APK size and web bundle export size.
  - Execute full test suite and typechecks.
