import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Award, Zap, Cpu, HardDrive, CheckCircle } from 'lucide-react-native';
import { BenchmarkResult } from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

interface PerformanceComparisonScreenProps {
  benchmarks: BenchmarkResult[];
  colors: ThemeColors;
  onNavigateToBenchmark: () => void;
}

export const PerformanceComparisonScreen: React.FC<PerformanceComparisonScreenProps> = ({
  benchmarks,
  colors,
  onNavigateToBenchmark,
}) => {
  // Map latest benchmark for each model
  const latestByModel = new Map<string, BenchmarkResult>();
  benchmarks.forEach((b) => {
    if (!latestByModel.has(b.modelId)) {
      latestByModel.set(b.modelId, b);
    }
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Performance Comparison"
        subtitle="Side-by-side on-device benchmark metrics"
        colors={colors}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Comparison Table / Cards */}
        {INITIAL_AI_MODELS.map((model) => {
          const result = latestByModel.get(model.id);

          return (
            <View
              key={model.id}
              style={[styles.modelCompareCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[styles.modelTitle, { color: colors.text }]}>{model.name}</Text>
                  <Text style={[styles.modelSubtitle, { color: colors.textMuted }]}>
                    {model.parameters} · {model.quantization}
                  </Text>
                </View>
                <View style={[styles.sizePill, { backgroundColor: colors.surface }]}>
                  <HardDrive size={12} color={colors.textMuted} />
                  <Text style={[styles.sizePillText, { color: colors.text }]}>
                    {model.fileSizeMB} MB
                  </Text>
                </View>
              </View>

              {result ? (
                <View style={styles.metricsContainer}>
                  {/* TPS Bar */}
                  <View style={styles.metricRow}>
                    <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Inference Speed:</Text>
                    <Text style={[styles.metricHighlight, { color: colors.primary }]}>
                      {result.tokensPerSecond} tokens/sec
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: colors.surface }]}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${Math.min(100, (result.tokensPerSecond / 60) * 100)}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>

                  {/* TTFT & Peak RAM */}
                  <View style={styles.gridRow}>
                    <View style={[styles.gridCell, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.cellLabel, { color: colors.textSubtle }]}>TTFT Latency</Text>
                      <Text style={[styles.cellValue, { color: colors.text }]}>
                        {result.timeToFirstTokenMs} ms
                      </Text>
                    </View>
                    <View style={[styles.gridCell, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.cellLabel, { color: colors.textSubtle }]}>Peak RAM</Text>
                      <Text style={[styles.cellValue, { color: colors.text }]}>
                        {result.peakMemoryMB} MB
                      </Text>
                    </View>
                    <View style={[styles.gridCell, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.cellLabel, { color: colors.textSubtle }]}>Accuracy</Text>
                      <Text style={[styles.cellValue, { color: colors.success }]}>
                        {result.taskSpecificAccuracy}%
                      </Text>
                    </View>
                  </View>

                  {/* Multilingual breakdown */}
                  <View style={styles.multiLangRow}>
                    <Text style={[styles.multiLangText, { color: colors.textMuted }]}>
                      Comprehension: EN {result.languageUnderstandingScores.english}% · TA {result.languageUnderstandingScores.tamil}% · Tanglish {result.languageUnderstandingScores.tanglish}%
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.noBenchBox, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.noBenchText, { color: colors.textMuted }]}>
                    No benchmark recorded yet for this model on current device.
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.benchmarkCta, { backgroundColor: colors.primary }]}
          onPress={onNavigateToBenchmark}
        >
          <Zap size={16} color="#FFFFFF" />
          <Text style={styles.benchmarkCtaText}>Run All Benchmarks Now</Text>
        </TouchableOpacity>
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
    gap: 14,
  },
  modelCompareCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modelSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sizePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsContainer: {
    gap: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricHighlight: {
    fontSize: 14,
    fontWeight: '700',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  gridCell: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cellLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  cellValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  multiLangRow: {
    marginTop: 2,
  },
  multiLangText: {
    fontSize: 11,
  },
  noBenchBox: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  noBenchText: {
    fontSize: 12,
  },
  benchmarkCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  benchmarkCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

