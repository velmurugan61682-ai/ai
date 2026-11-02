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
- **Qwen3 0.6B** (`Qwen2.5-0.5B-Instruct-Q4_K_M.gguf` ~398 MB) — Ultra-lightweight for 2GB+ devices.
- **Llama 3.2 1B** (`Llama-3.2-1B-Instruct-Q4_K_M.gguf` ~808 MB) — High quality, efficient 1B parameter model.
- **Qwen3 1.7B** (`Qwen2.5-1.5B-Instruct-Q4_K_M.gguf` ~986 MB) — Advanced reasoning for 6GB+ flagship phones.
- All models are downloaded directly from verified HuggingFace repositories with explicit customer approval, progress tracking, pause/resume, and SHA-256 integrity verification.

### 4. 💬 Offline AI Chat & Billing Intent Engine
- **Local Inference**: Zero telemetry or user prompt transmission. Works completely offline.
- **Token Streaming & Telemetry**: Live TTFT (Time to First Token) and TPS (Tokens Per Second).
- **Tamil / Tanglish Billing Parser**: High-accuracy natural language processing for retail and restaurant billing (e.g., *"Rendu Pepsi add pannu"*, *"Oru Coke add pannu"*, *"Moonu water bottle add pannu"*).
- **Safety Validation Guards**: Financial transactions, price changes, and inventory modifications require strict human authorization and validation flags.

### 5. ⚡ Standardized Benchmark Testing Suite
- Evaluates installed models using 5 standardized questions across English, Tamil, and Tanglish.
- Measures TTFT, TPS, peak RAM, stability/crash rates, and multilingual comprehension.
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
│   └── ModelDownloader.ts       # Resumable download manager
├── storage/
│   └── ModelStorage.ts          # Local model & benchmark persistence
└── theme/
    └── theme.ts                 # Light & Dark color tokens (#4D44E1)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- OpenJDK 17 LTS
- Android SDK (API 34/35)

### Setup & Run
```bash
# Install dependencies
npm install

# Run TypeScript check
npx tsc --noEmit

# Start Expo development server
npx expo start

# Build Android Debug APK
cd android
./gradlew assembleDebug
```
