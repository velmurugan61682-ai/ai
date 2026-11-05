# SaaS AI Brain – Mobile AI Platform

**SaaS AI Brain** is an enterprise-grade mobile AI platform built with **React Native**, **Expo (Prebuild/Development Build)**, **TypeScript**, **llama.rn**, and **llama.cpp** running quantized GGUF models directly on Android mobile devices with 100% offline edge inference.

---

## 🌟 Key Features

### 1. 🔍 Device Intelligence Engine
- **Hardware Telemetry**: Automatically queries native Android APIs for device manufacturer, model, Android OS version, API level, CPU architecture, and active CPU core count.
- **Physical RAM vs Virtual RAM**: Strictly measures physical RAM via Linux `/proc/meminfo` (`MemTotal`) and Android `ActivityManager.MemoryInfo.totalMem`. Virtual RAM / RAM Plus / zRAM extensions are completely excluded.
- **Storage & Battery Telemetry**: Measures available storage headroom, battery percentage, charging state, and thermal status.

### 2. 🧠 Multi-Dimensional Recommendation Engine
- Recommends the optimal model based on available RAM, physical RAM, model weight, context memory footprint, speed, accuracy, and thermal headroom.
- Supports customizable customer optimization strategies:
  - **Best Overall** (balanced)
  - **Fastest Response** (latency-focused)
  - **Best Accuracy** (capability-focused)
  - **Lowest Memory Usage** (conservative low-RAM devices)

### 3. 📦 Verified GGUF Model Registry
- **Qwen3 0.6B** (`Qwen3-0.6B-Q8_0.gguf` · 639,446,688 bytes · ~610 MB) — Ultra-lightweight default model for Android edge devices (2GB+ RAM).
- **Qwen3 1.7B** (`Qwen3-1.7B-Q8_0.gguf` · 1,834,426,016 bytes · ~1.75 GB) — Advanced multilingual reasoning and complex intent for 4GB+ devices.
- **Llama 3.2 1B** (`Llama-3.2-1B-Instruct-Q4_K_M.gguf` · 807,694,464 bytes · ~770 MB) — Meta's high-efficiency instruction-following edge model.
- All models are downloaded directly from verified HuggingFace repositories with explicit user approval, progress tracking, pause/resume, and SHA-256 integrity verification.

### 4. 💬 Offline AI Chat & Billing Intent Engine
- **Local Inference**: Zero telemetry or user prompt transmission. Works completely offline.
- **Token Streaming & Telemetry**: Real-time TTFT (Time to First Token) and TPS (Tokens Per Second) calculated strictly from active inference clocks.
- **Tamil / Tanglish Billing Parser**: Deterministic natural language processor for retail shop billing (e.g., *"Rendu Pepsi add pannu"*, *"3 biscuit add pannu"*, *"remove Pepsi"*, *"total evlo"*).
- **Safety Validation Guards**: Financial transactions, price changes, and inventory modifications require strict merchant confirmation.

### 5. ⚡ Standardized Benchmark Testing Suite
- Evaluates installed models using 5 standardized questions across English, Tamil, and Tanglish.
- Measures real TTFT, TPS, peak RAM, stability/crash rates, and multilingual comprehension.
- Saves all benchmark telemetry to local storage for comparative analysis.

---

## 📱 Application Screens

1. **Splash Screen** – SaaS AI Brain branding and engine initialization.
2. **Welcome Screen** – Onboarding and overview of local AI capabilities.
3. **Device Detection** – Live hardware scanning.
4. **Device Capacity Dashboard** – Detailed telemetry of RAM, CPU, storage, and thermals.
5. **AI Brain Dashboard** – Main executive hub (#4D44E1 design, dark mode support).
6. **AI Model Registry** – Catalog of registered models with specs and licenses.
7. **Model Download Manager** – Resumable downloads, checksums, pause/resume/delete.
8. **Model Selection** – Active model switcher with automatic native C++ memory release.
9. **AI Chat** – Offline streaming chat with billing intent preview.
10. **Benchmark Testing** – Cross-model test runner.
11. **Performance Comparison** – Comparative charts of TTFT and TPS across models.
12. **Settings** – Dark mode toggle, memory limits, context length, thread controls.

---

## 🏗️ Project Architecture

```
src/
├── brain/
│   ├── AIEngine.ts              # llama.rn JSI engine & Tanglish billing parser
│   ├── BenchmarkEngine.ts       # Standardized 5-question test harness
│   ├── DeviceDetector.ts        # Native Android hardware & physical RAM detector
│   ├── ModelSelector.ts         # Active model manager & memory deallocator
│   └── RecommendationEngine.ts  # Multi-variable scoring engine
├── components/
│   ├── DeviceInfoCard.tsx       # Hardware telemetry card
│   ├── Header.tsx               # App header with Dark Mode toggle
│   ├── ModelCard.tsx            # Model display & action card
│   ├── PerformanceCard.tsx      # Benchmark & metric visualization
│   └── StatBadge.tsx            # Metric badge component
├── models/
│   ├── modelRegistry.ts         # HuggingFace GGUF models & SHA-256 hashes
│   └── modelTypes.ts            # TypeScript interfaces
├── screens/
│   ├── AIChatScreen.tsx
│   ├── BenchmarkScreen.tsx
│   ├── BrainDashboard.tsx
│   ├── DeviceCapacityDashboard.tsx
│   ├── DeviceDetectionScreen.tsx
│   ├── ModelDownloadScreen.tsx
│   ├── ModelRegistryScreen.tsx
│   ├── ModelSelectionScreen.tsx
│   ├── PerformanceComparisonScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── SplashScreen.tsx
│   └── WelcomeScreen.tsx
├── services/
│   ├── DeviceService.ts         # Android memory & battery services
│   ├── ModelDownloader.ts       # Resumable download manager
│   ├── PhotoEditingService.ts   # Edge vector/canvas photo grading
│   ├── VisionService.ts         # Vision status & honest capabilities
│   └── VoiceService.ts          # Native & Web speech recognition
├── storage/
│   └── ModelStorage.ts          # Local model & benchmark persistence
└── theme/
    └── theme.ts                 # Light & Dark color tokens (#4D44E1)
```

---

## 🚀 Fresh Machine Setup & Build Instructions

### Prerequisites
1. **Node.js**: v18 or v20 LTS
2. **JDK 17**: OpenJDK 17 (set `JAVA_HOME` environment variable)
   - Windows PowerShell:
     ```powershell
     [System.Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot", "User")
     $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot"
     ```
   - macOS / Linux:
     ```bash
     export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
     ```
3. **Android SDK**: Command-line tools, platform-tools, build-tools 35.0.0, platforms android-35, and NDK (26.1.10909125).
   - Set `ANDROID_HOME` pointing to your Android SDK directory (e.g. `%LOCALAPPDATA%\Android\Sdk` on Windows).

### 1. Install Dependencies & Verify TypeScript
```bash
npm install
npm run typecheck
```

### 2. Export Web (Demo Mode)
```bash
npx expo export --platform web
```

### 3. Build & Install Android Debug APK
```bash
cd android
./gradlew assembleDebug
# If device/emulator is connected via ADB:
adb install app/build/outputs/apk/debug/app-debug.apk
```
*Note*: `android/gradle.properties` utilizes standard system `JAVA_HOME` and does not require hardcoded JDK paths. If `debug.keystore` is absent in `android/app`, the Android Gradle Plugin automatically defaults to your local `~/.android/debug.keystore` without build failure.


