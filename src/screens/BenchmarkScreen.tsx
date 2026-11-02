import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Play, Activity, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import {
  AIModelMetadata,
  BenchmarkResult,
  ModelRuntimeState,
} from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';
import { BenchmarkEngine, STANDARD_BENCHMARK_SUITE } from '../brain/BenchmarkEngine';
import { PerformanceCard } from '../components/PerformanceCard';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

interface BenchmarkScreenProps {
  modelStates: Record<string, ModelRuntimeState>;
  selectedModelId: string | null;
  benchmarkHistory: BenchmarkResult[];
  colors: ThemeColors;
  onBenchmarkComplete: (result: BenchmarkResult) => void;
  onNavigateToComparison: () => void;
}

export const BenchmarkScreen: React.FC<BenchmarkScreenProps> = ({
  modelStates,
  selectedModelId,
  benchmarkHistory,
  colors,
  onBenchmarkComplete,
  onNavigateToComparison,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [targetModelId, setTargetModelId] = useState<string>(
    selectedModelId || INITIAL_AI_MODELS[0].id
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(STANDARD_BENCHMARK_SUITE.length);
  const [activePrompt, setActivePrompt] = useState('');
  const [latestRun, setLatestRun] = useState<BenchmarkResult | null>(null);

  const downloadedModels = INITIAL_AI_MODELS.filter(
    (m) => modelStates[m.id]?.status === 'downloaded'
  );

  const handleStartBenchmark = async () => {
    if (isRunning) return;

    const state = modelStates[targetModelId];
    if (!state || state.status !== 'downloaded') {
      Alert.alert(
        'Model Not Downloaded',
        'Please download this model before running the benchmark suite.'
      );
      return;
    }

    setIsRunning(true);
    setCurrentStep(0);
    setActivePrompt('Starting hardware benchmark engine...');

    try {
      const benchmarkEngine = BenchmarkEngine.getInstance();
      const result = await benchmarkEngine.runBenchmarkOnModel(
        targetModelId,
        (step, total, prompt) => {
          setCurrentStep(step);
          setTotalSteps(total);
          setActivePrompt(prompt);
        }
      );

      setLatestRun(result);
      onBenchmarkComplete(result);
      Alert.alert(
        'Benchmark Finished',
        `Successfully evaluated ${result.modelName}.\nSpeed: ${result.tokensPerSecond} tokens/sec\nTTFT: ${result.timeToFirstTokenMs}ms`
      );
    } catch (err: any) {
      Alert.alert('Benchmark Notice', err?.message || 'Error occurred during benchmark execution');
    } finally {
      setIsRunning(false);
      setActivePrompt('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Benchmark Engine"
        subtitle="Standardized on-device performance testing"
        colors={colors}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Model Selector for Benchmark */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.textMuted }]}>
            Select Model to Evaluate:
          </Text>

          <View style={styles.modelPillsRow}>
            {INITIAL_AI_MODELS.map((model) => {
              const isSelected = targetModelId === model.id;
              const isDownloaded = modelStates[model.id]?.status === 'downloaded';

              return (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelPill,
                    {
                      backgroundColor: isSelected ? colors.primarySubtle : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                      opacity: isDownloaded ? 1 : 0.6,
                    },
                  ]}
                  onPress={() => setTargetModelId(model.id)}
                  disabled={isRunning}
                >
                  <Text
                    style={[
                      styles.modelPillText,
                      { color: isSelected ? colors.primary : colors.text },
                    ]}
                  >
                    {model.name}
                  </Text>
                  <Text style={[styles.modelPillSub, { color: colors.textSubtle }]}>
                    {isDownloaded ? 'Ready' : 'Not installed'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Standard Suite Info */}
          <View style={[styles.infoBox, { backgroundColor: colors.surface }]}>
            <ShieldCheck size={16} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Identical benchmark suite run across all models: English reasoning, Tamil/Tanglish POS billing, and token generation speed.
            </Text>
          </View>

          {/* Benchmark Action Button */}
          <TouchableOpacity
            style={[
              styles.startBtn,
              {
                backgroundColor: isRunning ? colors.cardBorder : colors.primary,
              },
            ]}
            onPress={handleStartBenchmark}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.startBtnText}>
                  Testing ({currentStep}/{totalSteps})...
                </Text>
              </>
            ) : (
              <>
                <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                <Text style={styles.startBtnText}>Execute Benchmark Suite</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Live Step Tracker while running */}
        {isRunning && (
          <View style={[styles.liveStepCard, { backgroundColor: colors.primarySubtle }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.liveStepTitle, { color: colors.primaryDark }]}>
                Prompt {currentStep} of {totalSteps}
              </Text>
              <Text style={[styles.livePromptText, { color: colors.primary }]}>
                "{activePrompt}"
              </Text>
            </View>
          </View>
        )}

        {/* Latest Run Results */}
        {latestRun && (
          <View style={styles.latestSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest Evaluation Run</Text>
            <PerformanceCard result={latestRun} colors={colors} />
          </View>
        )}

        {/* History / Compare Action */}
        {benchmarkHistory.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Benchmark History</Text>
              <TouchableOpacity onPress={onNavigateToComparison}>
                <Text style={[styles.compareLink, { color: colors.primary }]}>
                  Compare All Models →
                </Text>
              </TouchableOpacity>
            </View>

            {benchmarkHistory.slice(0, 3).map((item) => (
              <PerformanceCard key={item.id} result={item} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  card: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modelPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modelPill: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modelPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modelPillSub: {
    fontSize: 10,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  liveStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  liveStepTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  livePromptText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  latestSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  historySection: {
    gap: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compareLink: {
    fontSize: 13,
    fontWeight: '700',
  },
});

