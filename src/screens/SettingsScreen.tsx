import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Moon, RefreshCw, Trash2, ShieldCheck, Database, FileText, Info, Key, BookOpen, UserCheck, Volume2 } from 'lucide-react-native';
import { Header } from '../components/Header';
import { ThemeColors } from '../theme/theme';
import { ModelStorage } from '../storage/ModelStorage';
import { TiyoEmployeeService, EmployeePersonality, TiyoLanguage } from '../services/TiyoEmployeeService';

interface SettingsScreenProps {
  darkMode: boolean;
  colors: ThemeColors;
  onToggleDarkMode: (enabled: boolean) => void;
  onRescanHardware: () => void;
  onClearAllData: () => void;
  onNavigateToApiKeys?: () => void;
  onNavigateToApiDocs?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  darkMode,
  colors,
  onToggleDarkMode,
  onRescanHardware,
  onClearAllData,
  onNavigateToApiKeys,
  onNavigateToApiDocs,
}) => {
  const tiyoService = TiyoEmployeeService.getInstance();
  const [tiyoConfig, setTiyoConfig] = useState(tiyoService.getConfig());

  const confirmClearAll = () => {
    Alert.alert(
      'Clear All Local Data',
      'This will delete all saved benchmark scores, chat logs, and active cart. Downloaded model files will remain intact.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await tiyoService.clearCart();
            onClearAllData();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="Settings & Privacy"
        subtitle="Manage local storage, inference settings & privacy"
        colors={colors}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Appearance */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Appearance & Theme</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Moon size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  High contrast dark SaaS theme
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onToggleDarkMode}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Tiyo Employee Personality */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <UserCheck size={18} color={colors.primary} />
            <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0 }]}>
              Tiyo · Shop Employee Personality
            </Text>
          </View>

          <Text style={[styles.subHeading, { color: colors.textSubtle }]}>Employee Tone</Text>
          <View style={styles.pillGrid}>
            {[
              { id: 'friendly', label: 'Friendly (Default)' },
              { id: 'professional', label: 'Professional' },
              { id: 'casual', label: 'Casual Buddy' },
            ].map((p) => {
              const isSel = tiyoConfig.personality === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.pillOption,
                    {
                      backgroundColor: isSel ? colors.primary : colors.surface,
                      borderColor: isSel ? colors.primary : colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    const next = { ...tiyoConfig, personality: p.id as EmployeePersonality };
                    setTiyoConfig(next);
                    tiyoService.saveConfig(next);
                  }}
                >
                  <Text style={[styles.pillOptionText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subHeading, { color: colors.textSubtle, marginTop: 12 }]}>Language</Text>
          <View style={styles.pillGrid}>
            {[
              { id: 'tanglish', label: 'Tanglish' },
              { id: 'tamil', label: 'Tamil' },
              { id: 'english', label: 'English' },
              { id: 'auto', label: 'Auto' },
            ].map((lang) => {
              const isSel = tiyoConfig.language === lang.id;
              return (
                <TouchableOpacity
                  key={lang.id}
                  style={[
                    styles.pillOption,
                    {
                      backgroundColor: isSel ? colors.primary : colors.surface,
                      borderColor: isSel ? colors.primary : colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    const next = { ...tiyoConfig, language: lang.id as TiyoLanguage };
                    setTiyoConfig(next);
                    tiyoService.saveConfig(next);
                  }}
                >
                  <Text style={[styles.pillOptionText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider, marginVertical: 12 }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Volume2 size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Voice Speech Output</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Tiyo speaks responses aloud
                </Text>
              </View>
            </View>
            <Switch
              value={tiyoConfig.voiceEnabled}
              onValueChange={(val) => {
                const next = { ...tiyoConfig, voiceEnabled: val };
                setTiyoConfig(next);
                tiyoService.saveConfig(next);
              }}
              trackColor={{ false: colors.cardBorder, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Hardware & Diagnostics */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Diagnostics</Text>

          <TouchableOpacity style={styles.actionRow} onPress={onRescanHardware}>
            <View style={styles.settingLeft}>
              <RefreshCw size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Re-scan Hardware</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Re-evaluate RAM, storage, and thermal state
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <TouchableOpacity style={styles.actionRow} onPress={confirmClearAll}>
            <View style={styles.settingLeft}>
              <Trash2 size={18} color={colors.error} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.error }]}>Reset Chat & Benchmarks</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Clear local chat history and benchmark records
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Developer & API Access */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Developer & API Access</Text>

          <TouchableOpacity style={styles.actionRow} onPress={onNavigateToApiKeys}>
            <View style={styles.settingLeft}>
              <Key size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>API Key Management</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Generate, inspect, and revoke programmatic Bearer tokens
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          <TouchableOpacity style={styles.actionRow} onPress={onNavigateToApiDocs}>
            <View style={styles.settingLeft}>
              <BookOpen size={18} color={colors.primary} />
              <View>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Developer API Docs</Text>
                <Text style={[styles.settingDesc, { color: colors.textMuted }]}>
                  Endpoints, cURL examples, rate limits, and code samples
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Privacy & Safety Statement */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.privacyHeader}>
            <ShieldCheck size={20} color={colors.success} />
            <Text style={[styles.sectionHeading, { color: colors.text, marginBottom: 0 }]}>
              Privacy & Security Guarantee
            </Text>
          </View>
          <Text style={[styles.privacyStatement, { color: colors.textMuted }]}>
            SaaS AI Brain is architected with strict edge privacy. All model weights are downloaded directly to application private sandbox storage. Inference occurs strictly inside llama.cpp via native JSI without external cloud endpoints or telemetry collection.
          </Text>
          <View style={[styles.securityBadge, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.securityBadgeText, { color: colors.success }]}>
              Zero Cloud Prompts · 100% Offline Capable
            </Text>
          </View>
        </View>

        {/* Model Licensing & Information */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Model Licenses</Text>
          <Text style={[styles.licenseItem, { color: colors.textMuted }]}>
            • Qwen 2.5 / Qwen3: Apache License 2.0 (Alibaba Cloud)
          </Text>
          <Text style={[styles.licenseItem, { color: colors.textMuted }]}>
            • Llama 3.2: Llama 3.2 Community License (Meta Platforms, Inc.)
          </Text>
          <Text style={[styles.licenseItem, { color: colors.textMuted }]}>
            • llama.cpp & llama.rn: MIT License (Georgi Gerganov & mybigday)
          </Text>
        </View>
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
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyStatement: {
    fontSize: 12,
    lineHeight: 18,
  },
  securityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  licenseItem: {
    fontSize: 12,
    lineHeight: 17,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pillOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

