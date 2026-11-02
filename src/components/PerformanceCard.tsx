import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gauge, Clock, Cpu, Battery, CheckCircle2 } from 'lucide-react-native';
import { BenchmarkResult } from '../models/modelTypes';
import { ThemeColors } from '../theme/theme';

interface PerformanceCardProps {
  result: BenchmarkResult;
  colors: ThemeColors;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({ result, colors }) => {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.modelTitle, { color: colors.text }]}>{result.modelName}</Text>
          <Text style={[styles.dateText, { color: colors.textSubtle }]}>
            {new Date(result.timestamp).toLocaleDateString()} at{' '}
            {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[styles.stabilityBadge, { backgroundColor: colors.successLight }]}>
          <CheckCircle2 size={13} color={colors.success} />
          <Text style={[styles.stabilityText, { color: colors.success }]}>
            {result.stabilityScore}% Stable
          </Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        {/* Tokens / Sec */}
        <View style={[styles.metricBox, { backgroundColor: colors.surface }]}>
          <View style={styles.metricIconRow}>
            <Gauge size={15} color={colors.primary} />
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Speed</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.primary }]}>
            {result.tokensPerSecond} <Text style={styles.unitText}>tps</Text>
          </Text>
          <Text style={[styles.metricSub, { color: colors.textSubtle }]}>Tokens / second</Text>
        </View>

        {/* Time to First Token */}
        <View style={[styles.metricBox, { backgroundColor: colors.surface }]}>
          <View style={styles.metricIconRow}>
            <Clock size={15} color="#8B5CF6" />
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>TTFT Latency</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {result.timeToFirstTokenMs} <Text style={styles.unitText}>ms</Text>
          </Text>
          <Text style={[styles.metricSub, { color: colors.textSubtle }]}>First token response</Text>
        </View>

        {/* Peak Memory */}
        <View style={[styles.metricBox, { backgroundColor: colors.surface }]}>
          <View style={styles.metricIconRow}>
            <Cpu size={15} color="#F59E0B" />
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>RAM Footprint</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {result.peakMemoryMB} <Text style={styles.unitText}>MB</Text>
          </Text>
          <Text style={[styles.metricSub, { color: colors.textSubtle }]}>Peak memory used</Text>
        </View>

        {/* Battery Impact */}
        <View style={[styles.metricBox, { backgroundColor: colors.surface }]}>
          <View style={styles.metricIconRow}>
            <Battery size={15} color={colors.accent} />
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Battery Impact</Text>
          </View>
          <Text style={[styles.metricValue, { color: colors.text }]}>{result.batteryImpact}</Text>
          <Text style={[styles.metricSub, { color: colors.textSubtle }]}>{result.thermalStatus}</Text>
        </View>
      </View>

      {/* Multilingual Accuracy Scores */}
      <View style={[styles.langScoresSection, { borderTopColor: colors.divider }]}>
        <Text style={[styles.langTitle, { color: colors.textMuted }]}>
          Language Comprehension Accuracy:
        </Text>
        <View style={styles.langScoresRow}>
          <View style={styles.langPill}>
            <Text style={[styles.langName, { color: colors.text }]}>English</Text>
            <Text style={[styles.langVal, { color: colors.primary }]}>
              {result.languageUnderstandingScores.english}%
            </Text>
          </View>
          <View style={styles.langPill}>
            <Text style={[styles.langName, { color: colors.text }]}>Tamil</Text>
            <Text style={[styles.langVal, { color: colors.primary }]}>
              {result.languageUnderstandingScores.tamil}%
            </Text>
          </View>
          <View style={styles.langPill}>
            <Text style={[styles.langName, { color: colors.text }]}>Tanglish</Text>
            <Text style={[styles.langVal, { color: colors.primary }]}>
              {result.languageUnderstandingScores.tanglish}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modelTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
    marginTop: 2,
  },
  stabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stabilityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metricSub: {
    fontSize: 10,
    marginTop: 3,
  },
  langScoresSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  langTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  langScoresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  langPill: {
    alignItems: 'center',
    flex: 1,
  },
  langName: {
    fontSize: 11,
    fontWeight: '500',
  },
  langVal: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
});

