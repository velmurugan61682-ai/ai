import {
  AIModelMetadata,
  DeviceHardwareInfo,
  ModelRecommendation,
  RecommendationPreference,
} from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';

export class RecommendationEngine {
  private static instance: RecommendationEngine;

  private constructor() {}

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  /**
   * Evaluates all models against the device's multi-dimensional profile:
   * Available RAM, Physical RAM, Model Size, Storage Headroom, CPU/GPU,
   * Battery level, Thermal state, and the user's priority preference.
   *
   * Crucially: Never evaluates RAM alone!
   */
  public evaluateModels(
    hardware: DeviceHardwareInfo,
    preference: RecommendationPreference = 'overall'
  ): ModelRecommendation[] {
    const recommendations = INITIAL_AI_MODELS.map((model) =>
      this.evaluateSingleModel(model, hardware, preference)
    );

    // Sort by compatibility score descending
    recommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // Mark highest compatible as top pick
    let foundTop = false;
    for (const rec of recommendations) {
      if (rec.isCompatible && !foundTop) {
        rec.isTopPick = true;
        foundTop = true;
      } else {
        rec.isTopPick = false;
      }
    }

    return recommendations;
  }

  public evaluateSingleModel(
    model: AIModelMetadata,
    hardware: DeviceHardwareInfo,
    preference: RecommendationPreference
  ): ModelRecommendation {
    let score = 50; // base score
    let isCompatible = true;
    const reasons: string[] = [];
    let incompatibilityReason: string | undefined;

    // 1. Storage Check (Hard Constraint)
    const requiredStorageMB = model.minStorageMB;
    const freeStorageMB = hardware.freeStorageGB * 1024;
    if (freeStorageMB < requiredStorageMB) {
      isCompatible = false;
      incompatibilityReason = `Insufficient storage. Requires ${requiredStorageMB} MB, but only ${Math.round(
        freeStorageMB
      )} MB is free.`;
    }

    // 2. Physical & Available RAM Multi-check
    // (Notice: We consider both physical capacity and available runtime headroom)
    if (hardware.totalPhysicalRAMGB < model.minPhysicalRAMGB) {
      if (model.id === 'qwen3-0.6b') {
        // Can run on low RAM devices with minimal context
        score -= 15;
      } else {
        isCompatible = false;
        incompatibilityReason = `Physical RAM (${hardware.totalPhysicalRAMGB} GB) is below minimum required (${model.minPhysicalRAMGB} GB).`;
      }
    }

    const ramHeadroom = hardware.availableRAMGB - model.recommendedAvailableRAMGB;
    if (ramHeadroom >= 1.0) {
      score += 20;
      reasons.push('Generous RAM headroom ensures stutter-free inference');
    } else if (ramHeadroom >= 0) {
      score += 10;
      reasons.push('Comfortable memory headroom available');
    } else {
      score -= 20;
      reasons.push('Available RAM is tight; potential background app purge');
    }

    // 3. CPU / GPU Capabilities
    const isArm64 = hardware.cpuArchitecture.includes('arm64') || hardware.cpuArchitecture.includes('aarch64');
    if (isArm64) {
      score += 15;
      reasons.push('Native 64-bit ARM NEON vector instructions supported');
    }

    // 4. Battery & Thermal Status
    if (hardware.batteryLevel < 20 && !hardware.isCharging) {
      score -= 15;
      if (model.id === 'qwen3-0.6b') {
        score += 10;
        reasons.push('Low battery: Lightweight model minimizes power drain');
      } else {
        reasons.push('Low battery: Higher parameter model will increase battery consumption');
      }
    } else if (hardware.isCharging) {
      score += 10;
      reasons.push('Device plugged in: Maximum CPU frequency available without power penalty');
    }

    if (hardware.thermalStatus.includes('THROTTLE')) {
      if (model.id === 'qwen3-0.6b') {
        score += 15;
        reasons.push('Device thermal warning: Recommended low-heat model');
      } else {
        score -= 25;
        reasons.push('Thermal throttling active: heavy model may cause lag');
      }
    }

    // 5. Customer Preference Weighting
    switch (preference) {
      case 'speed':
        // Heavily reward speed rating
        score += model.speedRating * 8;
        if (model.id === 'qwen3-0.6b') {
          score += 15;
          reasons.push('Top pick for fastest response time (<120ms TTFT)');
        }
        break;

      case 'accuracy':
        // Heavily reward accuracy rating
        score += model.accuracyRating * 8;
        if (model.id === 'qwen3-1.7b' || model.id === 'llama-3.2-1b') {
          score += 15;
          reasons.push('Highest reasoning depth and complex command understanding');
        }
        break;

      case 'lowest-memory':
        // Heavily reward memory efficiency
        score += model.memoryEfficiencyRating * 8;
        if (model.id === 'qwen3-0.6b') {
          score += 20;
          reasons.push('Lowest memory usage (<400MB total execution RAM)');
        }
        break;

      case 'overall':
      default:
        // Balanced formula: Speed (30%) + Accuracy (35%) + Efficiency (35%)
        const balancedRating =
          model.speedRating * 0.3 +
          model.accuracyRating * 0.35 +
          model.memoryEfficiencyRating * 0.35;
        score += Math.round(balancedRating * 7);

        if (hardware.totalPhysicalRAMGB >= 6.0) {
          if (model.id === 'qwen3-1.7b' || model.id === 'llama-3.2-1b') {
            score += 10;
            reasons.push('Flagship hardware allows full reasoning capabilities');
          }
        } else if (hardware.totalPhysicalRAMGB >= 4.0) {
          if (model.id === 'llama-3.2-1b' || model.id === 'qwen3-0.6b') {
            score += 10;
            reasons.push('Ideal match for mid-tier hardware balance');
          }
        } else {
          if (model.id === 'qwen3-0.6b') {
            score += 15;
            reasons.push('Ideal match for constrained hardware');
          }
        }
        break;
    }

    // Bound score strictly between 0 and 100
    const finalScore = isCompatible ? Math.max(10, Math.min(99, score)) : 0;
    const recommendationReason = reasons.length > 0 ? reasons.join('. ') + '.' : 'Compatible with device specifications.';

    return {
      model,
      compatibilityScore: finalScore,
      isCompatible,
      incompatibilityReason,
      recommendationReason,
      isTopPick: false,
    };
  }
}

