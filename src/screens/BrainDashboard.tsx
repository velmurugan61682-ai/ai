import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Brain,
  Cpu,
  HardDrive,
  MessageSquare,
  Activity,
  Download,
  Settings,
  Zap,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react-native';
import {
  AIModelMetadata,
  BenchmarkResult,
  DeviceHardwareInfo,
  ModelRuntimeState,
} from '../models/modelTypes';
import { PerformanceCard } from '../components/PerformanceCard';
import { ThemeColors } from '../theme/theme';

interface BrainDashboardProps {
  hardware: DeviceHardwareInfo;
  selectedModel: AIModelMetadata | null;
  runtimeState?: ModelRuntimeState;
  latestBenchmark: BenchmarkResult | null;
  colors: ThemeColors;
  onNavigate: (screen: string) => void;
}

export const BrainDashboard: React.FC<BrainDashboardProps> = ({
  hardware,
  selectedModel,
  runtimeState,
  latestBenchmark,
  colors,
  onNavigate,
}) => {
  const isModelReady = runtimeState?.status === 'downloaded' && selectedModel !== null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* SaaS App Header Card */}
      <View style={[styles.heroCard, { backgroundColor: '#4D44E1' }]}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroBrand}>SaaS AI Brain</Text>
            <Text style={styles.heroSubtitle}>Edge Intelligence Hub</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Offline Node</Text>
          </View>
        </View>

        {/* Device Quick Stats Banner */}
        <View style={styles.deviceStatsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Device</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {hardware.manufacturer} {hardware.modelName}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>RAM (Phys/Avail)</Text>
            <Text style={styles.statValue}>
              {hardware.totalPhysicalRAMGB}G / {hardware.availableRAMGB}G
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Free Disk</Text>
            <Text style={styles.statValue}>{hardware.freeStorageGB} GB</Text>
          </View>
        </View>
      </View>

      {/* Selected Model Status Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primarySubtle }]}>
              <Brain size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Active AI Engine</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
                {selectedModel ? selectedModel.name : 'No model loaded'}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isModelReady
                  ? colors.successLight
                  : colors.warningLight,
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: isModelReady ? colors.success : colors.warning },
              ]}
            >
              {isModelReady ? 'Ready & Offline' : runtimeState?.status || 'Select Model'}
            </Text>
          </View>
        </View>

        {selectedModel ? (
          <View style={styles.modelMetaBox}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.textSubtle }]}>Architecture:</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {selectedModel.family} · {selectedModel.parameters}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.textSubtle }]}>Quantization:</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {selectedModel.quantization} (Edge GGUF)
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaKey, { color: colors.textSubtle }]}>Context Length:</Text>
              <Text style={[styles.metaVal, { color: colors.text }]}>
                {selectedModel.contextWindow} tokens
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => onNavigate('AIChat')}
            >
              <MessageSquare size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Open AI Chat Interface</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyModelBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No model is currently selected. Browse the Model Registry to download and activate a model.
            </Text>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => onNavigate('ModelRegistry')}
            >
              <Download size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Browse AI Registry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Launch Action Tiles */}
      <View style={styles.quickTilesRow}>
        <TouchableOpacity
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => onNavigate('AIChat')}
        >
          <View style={[styles.tileIcon, { backgroundColor: colors.primarySubtle }]}>
            <MessageSquare size={20} color={colors.primary} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>AI Chat</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Offline prompts & POS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => onNavigate('Benchmark')}
        >
          <View style={[styles.tileIcon, { backgroundColor: '#FEF3C7' }]}>
            <Activity size={20} color="#D97706" />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Benchmark</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Speed, TPS & Accuracy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => onNavigate('ModelDownload')}
        >
          <View style={[styles.tileIcon, { backgroundColor: colors.successLight }]}>
            <Download size={20} color={colors.success} />
          </View>
          <Text style={[styles.tileTitle, { color: colors.text }]}>Downloads</Text>
          <Text style={[styles.tileDesc, { color: colors.textMuted }]}>Manage GGUF files</Text>
        </TouchableOpacity>
      </View>

      {/* AI Performance & Latest Benchmark */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Latest Hardware Benchmark</Text>
        <TouchableOpacity onPress={() => onNavigate('Benchmark')}>
          <Text style={[styles.sectionLink, { color: colors.primary }]}>Run Tests</Text>
        </TouchableOpacity>
      </View>

      {latestBenchmark ? (
        <PerformanceCard result={latestBenchmark} colors={colors} />
      ) : (
        <View style={[styles.benchmarkPlaceholder, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Activity size={28} color={colors.primary} />
          <Text style={[styles.placeholderTitle, { color: colors.text }]}>No Benchmarks Run Yet</Text>
          <Text style={[styles.placeholderSubtitle, { color: colors.textMuted }]}>
            Evaluate model tokens per second, latency, and multilingual accuracy on this device.
          </Text>
          <TouchableOpacity
            style={[styles.secondaryActionBtn, { borderColor: colors.primary }]}
            onPress={() => onNavigate('Benchmark')}
          >
            <Text style={[styles.secondaryActionText, { color: colors.primary }]}>
              Run Comprehensive Benchmark
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#4D44E1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroBrand: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deviceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: 12,
  },
  statBox: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modelMetaBox: {
    marginTop: 14,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaKey: {
    fontSize: 12,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyModelBox: {
    marginTop: 14,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quickTilesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTile: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  tileDesc: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  benchmarkPlaceholder: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  placeholderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  placeholderSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 16,
  },
  secondaryActionBtn: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

