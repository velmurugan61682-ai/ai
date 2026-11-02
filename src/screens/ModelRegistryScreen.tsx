import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import {
  SlidersHorizontal,
  Download,
  ShieldCheck,
  Check,
  Info,
  X,
  AlertTriangle,
} from 'lucide-react-native';
import {
  AIModelMetadata,
  DeviceHardwareInfo,
  ModelRecommendation,
  ModelRuntimeState,
  RecommendationPreference,
} from '../models/modelTypes';
import { INITIAL_AI_MODELS } from '../models/modelRegistry';
import { RecommendationEngine } from '../brain/RecommendationEngine';
import { ModelCard } from '../components/ModelCard';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';

interface ModelRegistryScreenProps {
  hardware: DeviceHardwareInfo;
  modelStates: Record<string, ModelRuntimeState>;
  selectedModelId: string | null;
  preference: RecommendationPreference;
  colors: ThemeColors;
  onPreferenceChange: (pref: RecommendationPreference) => void;
  onDownloadModel: (model: AIModelMetadata) => void;
  onSelectModel: (modelId: string) => void;
  onDeleteModel: (model: AIModelMetadata) => void;
}

export const ModelRegistryScreen: React.FC<ModelRegistryScreenProps> = ({
  hardware,
  modelStates,
  selectedModelId,
  preference,
  colors,
  onPreferenceChange,
  onDownloadModel,
  onSelectModel,
  onDeleteModel,
}) => {
  const [confirmModalModel, setConfirmModalModel] = useState<AIModelMetadata | null>(null);

  const recEngine = RecommendationEngine.getInstance();
  const recommendations = recEngine.evaluateModels(hardware, preference);

  const recMap = new Map<string, ModelRecommendation>();
  recommendations.forEach((r) => recMap.set(r.model.id, r));

  const preferencesList: { key: RecommendationPreference; label: string }[] = [
    { key: 'overall', label: 'Best Overall' },
    { key: 'speed', label: 'Fastest Speed' },
    { key: 'accuracy', label: 'Best Accuracy' },
    { key: 'lowest-memory', label: 'Lowest Memory' },
  ];

  const handleDownloadInitiate = (model: AIModelMetadata) => {
    // Show Customer Approval Dialog as required: "Download models only after customer approval"
    setConfirmModalModel(model);
  };

  const handleConfirmDownload = () => {
    if (confirmModalModel) {
      const model = confirmModalModel;
      setConfirmModalModel(null);
      onDownloadModel(model);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="AI Model Registry"
        subtitle="Hardware-verified GGUF Small Language Models"
        colors={colors}
      />

      {/* Customer Preference Selector */}
      <View style={[styles.prefFilterBar, { borderBottomColor: colors.divider }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={preferencesList}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.prefList}
          renderItem={({ item }) => {
            const isSelected = preference === item.key;
            return (
              <TouchableOpacity
                style={[
                  styles.prefChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.cardBorder,
                  },
                ]}
                onPress={() => onPreferenceChange(item.key)}
              >
                <Text
                  style={[
                    styles.prefChipText,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List of Models */}
      <FlatList
        data={INITIAL_AI_MODELS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ModelCard
            model={item}
            runtimeState={modelStates[item.id]}
            recommendation={recMap.get(item.id)}
            isSelected={selectedModelId === item.id}
            colors={colors}
            onDownloadPress={handleDownloadInitiate}
            onSelectPress={onSelectModel}
            onDeletePress={onDeleteModel}
          />
        )}
      />

      {/* Customer Approval Modal for Download */}
      <Modal
        visible={confirmModalModel !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalModel(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconBox, { backgroundColor: colors.primarySubtle }]}>
                <Download size={22} color={colors.primary} />
              </View>
              <TouchableOpacity onPress={() => setConfirmModalModel(null)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Confirm Model Download
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              You are about to download the complete offline model weights directly to your device storage.
            </Text>

            {confirmModalModel && (
              <View style={[styles.modalSummaryBox, { backgroundColor: colors.surface }]}>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalKey, { color: colors.textMuted }]}>Model:</Text>
                  <Text style={[styles.modalVal, { color: colors.text }]}>
                    {confirmModalModel.name}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalKey, { color: colors.textMuted }]}>Download Size:</Text>
                  <Text style={[styles.modalVal, { color: colors.text }]}>
                    {confirmModalModel.downloadSizeMB} MB
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalKey, { color: colors.textMuted }]}>License:</Text>
                  <Text style={[styles.modalVal, { color: colors.text }]}>
                    {confirmModalModel.license}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={[styles.modalKey, { color: colors.textMuted }]}>Storage Required:</Text>
                  <Text style={[styles.modalVal, { color: colors.success }]}>
                    {confirmModalModel.minStorageMB} MB free needed
                  </Text>
                </View>
              </View>
            )}

            <View style={[styles.privacyNote, { backgroundColor: colors.primarySubtle }]}>
              <ShieldCheck size={16} color={colors.primary} />
              <Text style={[styles.privacyText, { color: colors.primaryDark }]}>
                Once downloaded, the model operates 100% offline. No user prompts or queries will ever leave your phone.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.divider }]}
                onPress={() => setConfirmModalModel(null)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmDownload}
              >
                <Text style={styles.approveBtnText}>Approve & Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  prefFilterBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  prefList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  prefChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  prefChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },
  modalSummaryBox: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalKey: {
    fontSize: 12,
  },
  modalVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
  },
  privacyText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  approveBtn: {
    flex: 1.6,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

