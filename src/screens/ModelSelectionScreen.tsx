import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle, Zap, AlertCircle } from 'lucide-react-native';
import { AIModelMetadata, ModelRuntimeState } from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

interface ModelSelectionScreenProps {
  selectedModelId: string | null;
  modelStates: Record<string, ModelRuntimeState>;
  colors: ThemeColors;
  onSelectModel: (modelId: string) => void;
  onNavigateToRegistry: () => void;
}

export const ModelSelectionScreen: React.FC<ModelSelectionScreenProps> = ({
  selectedModelId,
  modelStates,
  colors,
  onSelectModel,
  onNavigateToRegistry,
}) => {
  const downloadedModels = INITIAL_AI_MODELS.filter(
    (m) => modelStates[m.id]?.status === 'downloaded'
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Select AI Model"
        subtitle="Switch active model in local system memory"
        colors={colors}
      />

      <View style={styles.content}>
        {downloadedModels.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <AlertCircle size={32} color={colors.warning} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Downloaded Models Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              You need to download at least one model from the registry before you can activate it.
            </Text>
            <TouchableOpacity
              style={[styles.registryBtn, { backgroundColor: colors.primary }]}
              onPress={onNavigateToRegistry}
            >
              <Text style={styles.registryBtnText}>Go to Model Registry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={downloadedModels}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedModelId === item.id;

              return (
                <TouchableOpacity
                  style={[
                    styles.modelOptionCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => onSelectModel(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.leftRow}>
                    {isSelected ? (
                      <CheckCircle2 size={22} color={colors.primary} />
                    ) : (
                      <Circle size={22} color={colors.textSubtle} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>
                        {item.quantization} · {item.parameters} · {item.fileSizeMB} MB
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rightTag}>
                    <Text style={[styles.speedText, { color: colors.primary }]}>
                      ⚡ {item.speedRating}/5 Speed
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  registryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  registryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 12,
  },
  modelOptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rightTag: {
    marginLeft: 8,
  },
  speedText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

