import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Download, Pause, Play, Trash2, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react-native';
import { AIModelMetadata, ModelRuntimeState } from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

interface ModelDownloadScreenProps {
  modelStates: Record<string, ModelRuntimeState>;
  colors: ThemeColors;
  onPause: (modelId: string) => void;
  onResume: (model: AIModelMetadata) => void;
  onDelete: (model: AIModelMetadata) => void;
  onSelect: (modelId: string) => void;
  selectedModelId: string | null;
}

export const ModelDownloadScreen: React.FC<ModelDownloadScreenProps> = ({
  modelStates,
  colors,
  onPause,
  onResume,
  onDelete,
  onSelect,
  selectedModelId,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Download Manager"
        subtitle="Manage local GGUF models on device storage"
        colors={colors}
      />

      {Platform.OS === 'web' && (
        <View style={styles.webNoticeBanner}>
          <Text style={styles.webNoticeText}>
            ℹ️ <Text style={{ fontWeight: '700' }}>Demo mode – no real AI.</Text> Real GGUF model storage and on-device execution requires the native Android application.
          </Text>
        </View>
      )}

      <FlatList
        data={INITIAL_AI_MODELS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const state = modelStates[item.id] || {
            modelId: item.id,
            status: 'not_downloaded',
            downloadProgress: 0,
            downloadedBytes: 0,
            totalBytes: item.fileSizeMB * 1024 * 1024,
          };

          const isDownloaded = state.status === 'downloaded';
          const isDownloading = state.status === 'downloading';
          const isPaused = state.status === 'paused';
          const isVerifying = state.status === 'verifying';
          const isSelected = selectedModelId === item.id;

          const downloadedMB = Math.round((state.downloadedBytes / (1024 * 1024)) * 10) / 10;
          const totalMB = item.fileSizeMB;

          return (
            <View
              style={[
                styles.itemCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isSelected ? colors.primary : colors.cardBorder,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              {/* Card Top */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modelName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.modelSubtitle, { color: colors.textMuted }]}>
                    {item.quantization} · {item.parameters}
                  </Text>
                </View>

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isDownloaded
                        ? colors.successLight
                        : isDownloading
                        ? colors.primarySubtle
                        : isPaused
                        ? colors.warningLight
                        : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: isDownloaded
                          ? colors.success
                          : isDownloading
                          ? colors.primary
                          : isPaused
                          ? colors.warning
                          : colors.textMuted,
                      },
                    ]}
                  >
                    {isDownloaded
                      ? 'Downloaded'
                      : isDownloading
                      ? 'Downloading'
                      : isPaused
                      ? 'Paused'
                      : isVerifying
                      ? 'Verifying Checksum'
                      : 'Not Stored'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              {(isDownloading || isPaused || isVerifying) && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressMetaRow}>
                    <Text style={[styles.progressPercent, { color: colors.text }]}>
                      {state.downloadProgress}%
                    </Text>
                    <Text style={[styles.progressBytes, { color: colors.textMuted }]}>
                      {downloadedMB} MB / {totalMB} MB
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: colors.surface }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${state.downloadProgress}%`,
                          backgroundColor: isPaused ? colors.warning : colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Local File Path if downloaded */}
              {isDownloaded && state.localPath && (
                <View style={[styles.pathBox, { backgroundColor: colors.surface }]}>
                  <HardDrive size={13} color={colors.textMuted} />
                  <Text style={[styles.pathText, { color: colors.textMuted }]} numberOfLines={1}>
                    {state.localPath}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                {isDownloading && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.warning }]}
                    onPress={() => onPause(item.id)}
                  >
                    <Pause size={14} color={colors.warning} />
                    <Text style={[styles.actionBtnText, { color: colors.warning }]}>Pause</Text>
                  </TouchableOpacity>
                )}

                {isPaused && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: colors.primary }]}
                    onPress={() => onResume(item)}
                  >
                    <Play size={14} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Resume</Text>
                  </TouchableOpacity>
                )}

                {isDownloaded && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.selectBtn,
                        {
                          backgroundColor: isSelected ? colors.successLight : colors.primary,
                        },
                      ]}
                      onPress={() => onSelect(item.id)}
                    >
                      <CheckCircle2 size={15} color={isSelected ? colors.success : '#FFFFFF'} />
                      <Text
                        style={[
                          styles.selectBtnText,
                          { color: isSelected ? colors.success : '#FFFFFF' },
                        ]}
                      >
                        {isSelected ? 'Active Model' : 'Switch to this Model'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.deleteBtn, { borderColor: colors.divider }]}
                      onPress={() => onDelete(item)}
                    >
                      <Trash2 size={16} color={colors.error} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modelName: {
    fontSize: 16,
    fontWeight: '700',
  },
  modelSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressContainer: {
    marginTop: 12,
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBytes: {
    fontSize: 11,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  pathBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
  },
  pathText: {
    fontSize: 11,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webNoticeBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  webNoticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
});

