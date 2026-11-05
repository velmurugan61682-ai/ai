# Technical Exploration: Multimodal Vision On Android with llama.rn

**Date**: November 2026  
**Scope**: Feasibility of running quantized on-device Vision-Language Models (e.g., Qwen2-VL-2B, MobileVLM) on Android using `llama.rn` and React Native 0.76 (New Architecture).

---

## 1. Executive Summary

Running on-device local multimodal vision models directly on Android smartphones within React Native is currently **not viable for production deployment** on devices with under 6GB physical RAM. The application maintains an honest, transparent state:
```typescript
{
  hasVisionContext: false,
  status: "Image understanding not available yet"
}
```
No fake OCR or synthetic heuristics are injected into inference prompts.

---

## 2. Technical Architecture & Constraints

### 2.1 Native `mmproj` JSI Limitations in `llama.rn` (RN 0.76)
- **Separate Projection Weights**: In `llama.cpp`, multimodal models require two coupled GGUF files:
  1. Base language model weights (`.gguf`)
  2. Multimodal CLIP/vision encoder projector (`mmproj-*.gguf`)
- **Missing TurboModule API**: In `llama.rn` stable releases (0.12.x) targeting React Native 0.76's New Architecture (`newArchEnabled=true`), the JSI interface exposes `initLlama` for language tokens only. The native C++ bridge lacks high-level JSI bindings for `clip_model_init` and image patch token serialization on Android (`jniLibs`).
- **Binary Size & ABI Overhead**: Compiling `LLAMA_LLAVA=ON` and bundled OpenCV/vision dependencies into Android ABIs (`arm64-v8a`, `armeabi-v7a`, `x86_64`) inflates APK size by over 120MB, exceeding standard app distribution baselines.

### 2.2 Device Memory Budget & Android Low Memory Killer (LMK)
- **Model Footprint**:
  - `Qwen2-VL-2B-Instruct-Q4_K_M`: ~1.65 GB
  - `mmproj-qwen2-vl-2b-f16.gguf`: ~460 MB
  - Vision encoder activation buffers (image resolution 448×448): ~380 MB
  - Context KV cache for ~1,200 visual tokens (`n_ctx=2048`): ~450 MB
  - **Total Peak Memory Footprint**: **~2.94 GB**
- **Android LMK Thresholds**:
  On 4GB RAM Android devices, typical available RAM while background system processes run is ~1.4GB–1.8GB. Allocating ~2.9GB in userland triggers `SIGKILL` (Out Of Memory) from the Android kernel LMK daemon within seconds of loading the vision encoder.

---

## 3. Recommended Roadmap for Future Vision Support

1. **Wait for Official TurboModule Multimodal Support**:
   Monitor future stable releases of `llama.rn` for first-class `initVisionLlama({ model, mmproj })` JSI APIs.
2. **Sub-1B Vision Architectures**:
   Evaluate emerging ultra-compact vision models such as `SmolVLM-500M` or `Moondream2-Q4` (~650 MB total memory footprint) once GGUF projection layers stabilize.
3. **Hardware Requirement Gating**:
   When vision is wired, gate activation strictly on devices reporting `>= 6.0 GB` physical RAM via Linux `/proc/meminfo`.
