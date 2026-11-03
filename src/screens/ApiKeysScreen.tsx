import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Key,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  Trash2,
  Slash,
  Clock,
  BookOpen,
  Calendar,
  Shield,
  X,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';
import { ApiKeyService, ClientApiKey } from '../services/ApiKeyService';

interface ApiKeysScreenProps {
  colors: ThemeColors;
  onOpenDocs: () => void;
}

export const ApiKeysScreen: React.FC<ApiKeysScreenProps> = ({ colors, onOpenDocs }) => {
  const [keys, setKeys] = useState<ClientApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyDescription, setKeyDescription] = useState('');

  // One-time Revealed Secret Key Modal
  const [newlyCreatedSecretKey, setNewlyCreatedSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Copied item ID tracking for list items
  const [copiedPrefixId, setCopiedPrefixId] = useState<string | null>(null);

  const apiKeyService = ApiKeyService.getInstance();

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const data = await apiKeyService.listKeys();
      setKeys(data);
    } catch (e) {
      console.warn('Failed loading keys:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      Alert.alert('Required', 'Please enter a name for your API key.');
      return;
    }

    setIsGenerating(true);
    try {
      const created = await apiKeyService.generateKey(keyName, keyDescription);
      setShowCreateModal(false);
      setKeyName('');
      setKeyDescription('');

      if (created.rawKey) {
        setNewlyCreatedSecretKey(created.rawKey);
      }
      await loadKeys();
    } catch (err: any) {
      Alert.alert('Generation Error', err?.message || 'Failed generating API key');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = (key: ClientApiKey) => {
    Alert.alert(
      'Revoke API Key',
      `Are you sure you want to revoke "${key.name}"? Any applications using this key will immediately be blocked with 403 Forbidden.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke Key',
          style: 'destructive',
          onPress: async () => {
            await apiKeyService.revokeKey(key.id);
            await loadKeys();
          },
        },
      ]
    );
  };

  const handleDeleteKey = (key: ClientApiKey) => {
    Alert.alert(
      'Delete API Key',
      `Permanently delete "${key.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await apiKeyService.deleteKey(key.id, true);
            await loadKeys();
          },
        },
      ]
    );
  };

  const handleCopyText = (text: string, isFullSecret = false, keyId?: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    if (isFullSecret) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    } else if (keyId) {
      setCopiedPrefixId(keyId);
      setTimeout(() => setCopiedPrefixId(null), 2000);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Never';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="API Key Management"
        subtitle="Generate and manage secure programmatic access tokens"
        colors={colors}
        rightAction={
          <TouchableOpacity
            style={[styles.docsHeaderBtn, { backgroundColor: colors.surface }]}
            onPress={onOpenDocs}
          >
            <BookOpen size={14} color={colors.primary} />
            <Text style={[styles.docsHeaderBtnText, { color: colors.primary }]}>API Docs</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Banner Card */}
        <View style={[styles.bannerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.bannerHeader}>
            <View style={[styles.keyIconBubble, { backgroundColor: colors.primarySubtle }]}>
              <Key size={20} color={colors.primary} />
            </View>
            <View style={styles.bannerTitleGroup}>
              <Text style={[styles.bannerTitle, { color: colors.text }]}>Developer API Keys</Text>
              <Text style={[styles.bannerSubtitle, { color: colors.textMuted }]}>
                Authenticate requests to SaaS AI Brain models using Bearer token authentication.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.generateBtnText}>Generate New API Key</Text>
          </TouchableOpacity>
        </View>

        {/* Keys List */}
        <View style={styles.listSection}>
          <View style={styles.listHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Your API Keys ({keys.length})
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : keys.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Shield size={36} color={colors.textSubtle} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No API keys generated</Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                Create an API key to integrate SaaS AI Brain with your external apps, CLI tools, or webhooks.
              </Text>
              <TouchableOpacity
                style={[styles.emptyGenerateBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowCreateModal(true)}
              >
                <Plus size={14} color="#FFFFFF" />
                <Text style={styles.emptyGenerateText}>Create First Key</Text>
              </TouchableOpacity>
            </View>
          ) : (
            keys.map((k) => {
              const isActive = k.status === 'active';
              const isCopied = copiedPrefixId === k.id;

              return (
                <View
                  key={k.id}
                  style={[
                    styles.keyCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.keyCardTop}>
                    <View style={styles.keyNameRow}>
                      <Text style={[styles.keyName, { color: colors.text }]}>{k.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          isActive
                            ? { backgroundColor: '#D1FAE5' }
                            : { backgroundColor: '#FEE2E2' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isActive ? { color: '#065F46' } : { color: '#991B1B' },
                          ]}
                        >
                          {isActive ? 'Active' : 'Revoked'}
                        </Text>
                      </View>
                    </View>

                    {k.description ? (
                      <Text style={[styles.keyDescription, { color: colors.textMuted }]}>
                        {k.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Masked Key & Copy */}
                  <View style={[styles.keyDisplayRow, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.keyPrefixText, { color: colors.text }]}>{k.keyPrefix}</Text>
                    <TouchableOpacity
                      style={styles.copyPrefixBtn}
                      onPress={() => handleCopyText(k.keyPrefix, false, k.id)}
                    >
                      {isCopied ? (
                        <Check size={14} color={colors.success} />
                      ) : (
                        <Copy size={14} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Dates & Actions */}
                  <View style={styles.keyCardBottom}>
                    <View style={styles.metaCol}>
                      <View style={styles.metaRow}>
                        <Calendar size={12} color={colors.textSubtle} />
                        <Text style={[styles.metaText, { color: colors.textSubtle }]}>
                          Created: {formatDate(k.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.metaRow}>
                        <Clock size={12} color={colors.textSubtle} />
                        <Text style={[styles.metaText, { color: colors.textSubtle }]}>
                          Last used: {formatDate(k.lastUsedAt)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardActionsRow}>
                      {isActive && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: colors.cardBorder }]}
                          onPress={() => handleRevokeKey(k)}
                        >
                          <Slash size={13} color={colors.warning} />
                          <Text style={[styles.actionBtnText, { color: colors.warning }]}>Revoke</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionBtn, { borderColor: colors.cardBorder }]}
                        onPress={() => handleDeleteKey(k)}
                      >
                        <Trash2 size={13} color={colors.error} />
                        <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Create Key Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Generate API Key</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Key Name *</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              placeholder="e.g. Production Webhook, Development CLI"
              placeholderTextColor={colors.textSubtle}
              value={keyName}
              onChangeText={setKeyName}
              maxLength={60}
            />

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Description (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              placeholder="Describe the service or system using this token..."
              placeholderTextColor={colors.textSubtle}
              value={keyDescription}
              onChangeText={setKeyDescription}
              multiline
              maxLength={180}
            />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.cardBorder }]}
                onPress={() => setShowCreateModal(false)}
                disabled={isGenerating}
              >
                <Text style={[styles.modalCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleGenerateKey}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Generate Key</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* One-time Secret Key Revealed Modal */}
      <Modal visible={Boolean(newlyCreatedSecretKey)} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.secretModalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.warningRow}>
              <AlertTriangle size={24} color="#D97706" />
              <Text style={[styles.secretModalTitle, { color: colors.text }]}>Save Your Secret Key</Text>
            </View>

            <Text style={[styles.secretModalDesc, { color: colors.textMuted }]}>
              Please copy and safely store your API key now. For your security, this complete key will{' '}
              <Text style={{ fontWeight: '700', color: colors.error }}>never be displayed again</Text>.
            </Text>

            <View style={[styles.secretKeyBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.secretKeyText, { color: colors.primary }]}>
                {newlyCreatedSecretKey || ''}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.copySecretBtn, { backgroundColor: copiedKey ? colors.success : colors.primary }]}
              onPress={() => handleCopyText(newlyCreatedSecretKey || '', true)}
            >
              {copiedKey ? <Check size={16} color="#FFFFFF" /> : <Copy size={16} color="#FFFFFF" />}
              <Text style={styles.copySecretText}>
                {copiedKey ? 'Copied to Clipboard!' : 'Copy Complete Secret Key'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dismissSecretBtn, { borderColor: colors.cardBorder }]}
              onPress={() => setNewlyCreatedSecretKey(null)}
            >
              <Text style={[styles.dismissSecretText, { color: colors.text }]}>
                I have stored this key safely
              </Text>
            </TouchableOpacity>
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
  docsHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  docsHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  bannerCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  keyIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitleGroup: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  generateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  listSection: {
    gap: 12,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  centerContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 280,
  },
  emptyGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyGenerateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  keyCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  keyCardTop: {
    gap: 4,
  },
  keyNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  keyName: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  keyDescription: {
    fontSize: 12,
  },
  keyDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  keyPrefixText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
  },
  copyPrefixBtn: {
    padding: 4,
  },
  keyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  metaCol: {
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secretModalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secretModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  secretModalDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  secretKeyBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  secretKeyText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
  },
  copySecretBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  copySecretText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dismissSecretBtn: {
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  dismissSecretText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
