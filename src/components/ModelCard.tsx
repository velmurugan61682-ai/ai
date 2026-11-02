import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Download, CheckCircle, Trash2, Play, Pause, Zap, Award, AlertTriangle } from 'lucide-react-native';
import { AIModelMetadata, ModelRuntimeState, ModelRecommendation } from '../models/modelTypes';
import { ThemeColors } from '../theme/theme';

interface ModelCardProps {
  model: AIModelMetadata;
  runtimeState?: ModelRuntimeState;
  recommendation?: ModelRecommendation;
  isSelected?: boolean;
  colors: ThemeColors;
  onDownloadPress: (model: AIModelMetadata) => void;
  onPausePress?: (modelId: string) => void;
  onResumePress?: (model: AIModelMetadata) => void;
  onDeletePress?: (model: AIModelMetadata) => void;
  onSelectPress?: (modelId: string) => void;
  onCardPress?: (model: AIModelMetadata) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  runtimeState,
  recommendation,
  isSelected = false,
  colors,
  onDownloadPress,
  onPausePress,
  onResumePress,
  onDeletePress,
  onSelectPress,
  onCardPress,
}) => {
  const status = runtimeState?.status || 'not_downloaded';
  const progress = runtimeState?.downloadProgress || 0;
  const isDownloaded = status === 'downloaded';
  const isDownloading = status === 'downloading';
  const isPaused = status === 'paused';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onCardPress && onCardPress(model)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.cardBorder,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.modelName, { color: colors.text }]}>{model.name}</Text>
            {recommendation?.isTopPick && (
              <View style={[styles.topPickBadge, { backgroundColor: colors.primarySubtle }]}>
                <Award size={12} color={colors.primary} />
                <Text style={[styles.topPickText, { color: colors.primary }]}>Top Pick</Text>
              </View>
            )}
            {isSelected && (
              <View style={[styles.activeBadge, { backgroundColor: colors.successLight }]}>
                <Text style={[styles.activeText, { color: colors.success }]}>Active Model</Text>
              </View>
            )}
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{model.subtitle}</Text>
        </View>

        {/* Compatibility Score */}
        {recommendation && (
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor: recommendation.isCompatible
                  ? colors.successLight
                  : colors.errorLight,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                { color: recommendation.isCompatible ? colors.success : colors.error },
              ]}
            >
              {recommendation.compatibilityScore}% Fit
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={2}>
        {model.description}
      </Text>

      {/* Strengths Pills */}
      <View style={styles.tagsRow}>
        {model.tags.slice(0, 3).map((tag, idx) => (
          <View key={idx} style={[styles.tag, { backgroundColor: colors.surface }]}>
            <Text style={[styles.tagText, { color: colors.textMuted }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Specs Row */}
      <View style={[styles.specsRow, { borderTopColor: colors.divider, borderBottomColor: colors.divider }]}>
        <View style={styles.specItem}>
          <Text style={[styles.specLabel, { color: colors.textSubtle }]}>Size</Text>
          <Text style={[styles.specValue, { color: colors.text }]}>{model.fileSizeMB} MB</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={[styles.specLabel, { color: colors.textSubtle }]}>Quant</Text>
          <Text style={[styles.specValue, { color: colors.text }]}>{model.quantization}</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={[styles.specLabel, { color: colors.textSubtle }]}>Min RAM</Text>
          <Text style={[styles.specValue, { color: colors.text }]}>{model.minPhysicalRAMGB} GB</Text>
        </View>
        <View style={styles.specItem}>
          <Text style={[styles.specLabel, { color: colors.textSubtle }]}>Context</Text>
          <Text style={[styles.specValue, { color: colors.text }]}>{model.contextWindow} tok</Text>
        </View>
      </View>

      {/* Download Progress Bar if downloading */}
      {(isDownloading || isPaused) && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressStatusText, { color: colors.primary }]}>
              {isDownloading ? `Downloading... ${progress}%` : `Paused at ${progress}%`}
            </Text>
            <Text style={[styles.progressBytesText, { color: colors.textMuted }]}>
              {Math.round((progress / 100) * model.fileSizeMB)} / {model.fileSizeMB} MB
            </Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.surface }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress}%`, backgroundColor: isPaused ? colors.warning : colors.primary },
              ]}
            />
          </View>
        </View>
      )}

      {/* Recommendation Reason Note */}
      {recommendation?.recommendationReason && (
        <View style={[styles.recReasonBox, { backgroundColor: colors.primarySubtle }]}>
          <Text style={[styles.recReasonText, { color: colors.primaryDark }]}>
            💡 {recommendation.recommendationReason}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        {!isDownloaded && !isDownloading && !isPaused && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => onDownloadPress(model)}
          >
            <Download size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Download Model ({model.downloadSizeMB} MB)</Text>
          </TouchableOpacity>
        )}

        {isDownloading && (
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.warning }]}
            onPress={() => onPausePress && onPausePress(model.id)}
          >
            <Pause size={16} color={colors.warning} />
            <Text style={[styles.secondaryButtonText, { color: colors.warning }]}>Pause</Text>
          </TouchableOpacity>
        )}

        {isPaused && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => onResumePress && onResumePress(model)}
          >
            <Play size={16} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Resume Download</Text>
          </TouchableOpacity>
        )}

        {isDownloaded && (
          <View style={styles.downloadedActions}>
            <TouchableOpacity
              style={[
                styles.selectButton,
                {
                  backgroundColor: isSelected ? colors.successLight : colors.primary,
                  borderColor: isSelected ? colors.success : colors.primary,
                },
              ]}
              onPress={() => onSelectPress && onSelectPress(model.id)}
            >
              {isSelected ? (
                <>
                  <CheckCircle size={16} color={colors.success} />
                  <Text style={[styles.selectButtonText, { color: colors.success }]}>
                    Selected (Ready)
                  </Text>
                </>
              ) : (
                <>
                  <Zap size={16} color="#FFFFFF" />
                  <Text style={[styles.selectButtonText, { color: '#FFFFFF' }]}>Select Model</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: colors.divider }]}
              onPress={() => onDeletePress && onDeletePress(model)}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modelName: {
    fontSize: 17,
    fontWeight: '700',
  },
  topPickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topPickText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginVertical: 12,
  },
  specItem: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  progressSection: {
    marginVertical: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBytesText: {
    fontSize: 11,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  recReasonBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  recReasonText: {
    fontSize: 11,
    lineHeight: 15,
  },
  actionsRow: {
    marginTop: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  downloadedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

