import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { RefreshCw, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react-native';
import { DeviceHardwareInfo } from '../models/modelTypes';
import { DeviceInfoCard } from '../components/DeviceInfoCard';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

interface DeviceDashboardProps {
  hardware: DeviceHardwareInfo;
  colors: ThemeColors;
  onRefresh: () => void;
  onNavigateToRecommendations: () => void;
}

export const DeviceDashboard: React.FC<DeviceDashboardProps> = ({
  hardware,
  colors,
  onRefresh,
  onNavigateToRecommendations,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Device Capacity"
        subtitle="Hardware telemetry for edge AI model fitting"
        colors={colors}
        rightAction={
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <RefreshCw size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Hardware Card */}
        <DeviceInfoCard hardware={hardware} colors={colors} />

        {/* Deep Analysis Cards */}
        <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Memory Assessment</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>Physical Kernel RAM:</Text>
            <Text style={[styles.detailVal, { color: colors.text }]}>{hardware.totalPhysicalRAMGB} GB</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>Estimated Headroom:</Text>
            <Text style={[styles.detailVal, { color: colors.success }]}>{hardware.availableRAMGB} GB</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>Virtual Swap (RAM Plus):</Text>
            <Text style={[styles.detailVal, { color: colors.warning }]}>Excluded (Paging Protection)</Text>
          </View>

          <View style={[styles.tipBox, { backgroundColor: colors.surface }]}>
            <ShieldCheck size={16} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.textMuted }]}>
              {hardware.totalPhysicalRAMGB >= 4
                ? 'Your device has ample physical RAM to execute Qwen3 and Llama 3.2 quantized weights with zero page-fault freezes.'
                : 'Your device is optimized for lightweight SLMs like Qwen3 0.6B with minimal background overhead.'}
            </Text>
          </View>
        </View>

        {/* Processor & Accelerator */}
        <View style={[styles.analysisCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Compute & Acceleration</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>CPU Class:</Text>
            <Text style={[styles.detailVal, { color: colors.text }]}>{hardware.processorName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>Architecture:</Text>
            <Text style={[styles.detailVal, { color: colors.text }]}>{hardware.cpuArchitecture}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailKey, { color: colors.textMuted }]}>Graphics & NPU:</Text>
            <Text style={[styles.detailVal, { color: colors.text }]} numberOfLines={1}>
              {hardware.gpuCapabilities}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.recButton, { backgroundColor: colors.primary }]}
          onPress={onNavigateToRecommendations}
          activeOpacity={0.85}
        >
          <Sparkles size={18} color="#FFFFFF" />
          <Text style={styles.recButtonText}>Run AI Brain Recommendation</Text>
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
    gap: 12,
  },
  refreshBtn: {
    padding: 8,
  },
  analysisCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailKey: {
    fontSize: 13,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  tipText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  recButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 12,
    shadowColor: '#4D44E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  recButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

