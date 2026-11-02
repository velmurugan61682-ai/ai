import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cpu, HardDrive, Smartphone, BatteryCharging, ShieldAlert } from 'lucide-react-native';
import { DeviceHardwareInfo } from '../models/modelTypes';
import { ThemeColors } from '../theme/theme';

interface DeviceInfoCardProps {
  hardware: DeviceHardwareInfo;
  colors: ThemeColors;
}

export const DeviceInfoCard: React.FC<DeviceInfoCardProps> = ({ hardware, colors }) => {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.cardHeader}>
        <View style={styles.deviceTitleRow}>
          <View style={[styles.iconBox, { backgroundColor: colors.primarySubtle }]}>
            <Smartphone size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.deviceName, { color: colors.text }]}>
              {hardware.manufacturer} {hardware.modelName}
            </Text>
            <Text style={[styles.deviceOs, { color: colors.textMuted }]}>
              {hardware.androidVersion}
            </Text>
          </View>
        </View>
        <View style={[styles.verifiedBadge, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.verifiedText, { color: colors.success }]}>Hardware Verified</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {/* Grid of hardware details */}
      <View style={styles.statsGrid}>
        {/* RAM */}
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <View style={styles.statIconRow}>
            <Cpu size={16} color={colors.primary} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Physical RAM</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {hardware.totalPhysicalRAMGB} GB
          </Text>
          <Text style={[styles.statSub, { color: colors.success }]}>
            {hardware.availableRAMGB} GB available
          </Text>
        </View>

        {/* Storage */}
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <View style={styles.statIconRow}>
            <HardDrive size={16} color={colors.accent} />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Free Storage</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {hardware.freeStorageGB} GB
          </Text>
          <Text style={[styles.statSub, { color: colors.textMuted }]}>
            of {hardware.totalStorageGB} GB total
          </Text>
        </View>

        {/* CPU */}
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <View style={styles.statIconRow}>
            <Cpu size={16} color="#8B5CF6" />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>CPU Architecture</Text>
          </View>
          <Text style={[styles.statValueSmall, { color: colors.text }]} numberOfLines={1}>
            {hardware.cpuArchitecture}
          </Text>
          <Text style={[styles.statSub, { color: colors.textMuted }]}>
            {hardware.cpuCores} Cores
          </Text>
        </View>

        {/* Battery & Thermal */}
        <View style={[styles.statItem, { backgroundColor: colors.surface }]}>
          <View style={styles.statIconRow}>
            <BatteryCharging size={16} color="#F59E0B" />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Battery & Thermal</Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {hardware.batteryLevel}% {hardware.isCharging ? '⚡' : ''}
          </Text>
          <Text style={[styles.statSub, { color: colors.textMuted }]} numberOfLines={1}>
            {hardware.thermalStatus}
          </Text>
        </View>
      </View>

      {/* Virtual RAM Integrity Notice */}
      <View style={[styles.noteRow, { backgroundColor: colors.primarySubtle }]}>
        <ShieldAlert size={14} color={colors.primary} />
        <Text style={[styles.noteText, { color: colors.primaryDark }]}>
          Physical RAM verified directly via kernel telemetry. Virtual RAM / RAM Plus is excluded to prevent inference paging crashes.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginVertical: 8,
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
    gap: 8,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  deviceOs: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statItem: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statValueSmall: {
    fontSize: 13,
    fontWeight: '700',
  },
  statSub: {
    fontSize: 11,
    marginTop: 3,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  noteText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
});

