import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Cpu, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { DeviceService } from '../services/DeviceService';
import { DeviceHardwareInfo } from '../models/modelTypes';
import { ThemeColors } from '../theme/theme';

interface DeviceDetectionScreenProps {
  colors: ThemeColors;
  onDetectionComplete: (info: DeviceHardwareInfo) => void;
}

export const DeviceDetectionScreen: React.FC<DeviceDetectionScreenProps> = ({
  colors,
  onDetectionComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [detectedInfo, setDetectedInfo] = useState<DeviceHardwareInfo | null>(null);

  const steps = [
    'Scanning device model & Android API level...',
    'Probing physical RAM (excluding Virtual RAM / RAM Plus)...',
    'Analyzing CPU architecture & NEON vector registers...',
    'Checking free storage headroom for GGUF weights...',
    'Inspecting thermal throttle state & battery capacity...',
    'Hardware capability profile ready!',
  ];

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < steps.length) {
        setCurrentStep(step);
      } else {
        clearInterval(interval);
      }
    }, 450);

    DeviceService.getInstance()
      .getHardwareInfo(true)
      .then((info) => {
        setDetectedInfo(info);
      });

    return () => clearInterval(interval);
  }, []);

  const isDone = currentStep >= steps.length - 1 && detectedInfo !== null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconRing, { borderColor: colors.primarySubtle }]}>
          <View style={[styles.iconInner, { backgroundColor: colors.primary }]}>
            <Cpu size={40} color="#FFFFFF" />
          </View>
        </View>

        <Text style={[styles.heading, { color: colors.text }]}>Device Intelligence Engine</Text>
        <Text style={[styles.subheading, { color: colors.textMuted }]}>
          Evaluating mobile silicon to recommend optimal on-device SLMs
        </Text>

        {/* Steps List */}
        <View style={[styles.stepsContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {steps.map((text, idx) => {
            const isCompleted = currentStep > idx || isDone;
            const isCurrent = currentStep === idx && !isDone;

            return (
              <View key={idx} style={styles.stepRow}>
                {isCompleted ? (
                  <CheckCircle2 size={18} color={colors.success} />
                ) : isCurrent ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <View style={[styles.pendingDot, { backgroundColor: colors.textSubtle }]} />
                )}
                <Text
                  style={[
                    styles.stepText,
                    {
                      color: isCompleted
                        ? colors.text
                        : isCurrent
                        ? colors.primary
                        : colors.textSubtle,
                      fontWeight: isCurrent ? '700' : '400',
                    },
                  ]}
                >
                  {text}
                </Text>
              </View>
            );
          })}
        </View>

        {isDone && detectedInfo && (
          <View style={[styles.summaryPill, { backgroundColor: colors.primarySubtle }]}>
            <Text style={[styles.summaryText, { color: colors.primaryDark }]}>
              Detected: {detectedInfo.manufacturer} {detectedInfo.modelName} ·{' '}
              {detectedInfo.totalPhysicalRAMGB}GB RAM · {detectedInfo.freeStorageGB}GB Free
            </Text>
          </View>
        )}

        {isDone && detectedInfo && (
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.primary }]}
            onPress={() => onDetectionComplete(detectedInfo)}
          >
            <Text style={styles.continueText}>View Capacity Dashboard</Text>
            <ArrowRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subheading: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  stepsContainer: {
    width: '100%',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  stepText: {
    fontSize: 13,
    flex: 1,
  },
  summaryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 15,
    borderRadius: 12,
  },
  continueText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

