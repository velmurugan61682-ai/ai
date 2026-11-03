import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Cpu, ShieldCheck, Zap, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react-native';
import { ThemeColors } from '../theme/theme';

interface WelcomeScreenProps {
  colors: ThemeColors;
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ colors, onGetStarted }) => {
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBox}>
        <Image
          source={require('../../assets/ai-brain-icon-1024.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={[styles.badge, { backgroundColor: colors.primarySubtle }]}>
          <Sparkles size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>Enterprise Edge AI</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          SaaS AI Brain
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Run powerful small language models directly on your phone hardware. Zero cloud latency, zero monthly API costs, and absolute data privacy.
        </Text>
      </View>

      {/* Feature Highlights */}
      <View style={styles.featureList}>
        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primarySubtle }]}>
            <Cpu size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Hardware Intelligence</Text>
            <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
              Scans your device's physical RAM, CPU cores, thermal status, and storage to pick the perfect model.
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
            <ShieldCheck size={22} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>100% Offline AI Execution</Text>
            <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
              Once downloaded, inference runs fully on-device via llama.cpp. Airplane mode ready.
            </Text>
          </View>
        </View>

        <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Zap size={22} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Tamil & Tanglish Billing Logic</Text>
            <Text style={[styles.featureDesc, { color: colors.textMuted }]}>
              Built-in parser for natural voice/text commands ("Rendu Pepsi add pannu", "Oru Coke add pannu").
            </Text>
          </View>
        </View>
      </View>

      {/* Pre-installed models summary */}
      <View style={[styles.modelsSummaryCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Compatible Initial Models:</Text>
        <View style={styles.modelRow}>
          <CheckCircle2 size={16} color={colors.primary} />
          <Text style={[styles.modelText, { color: colors.text }]}>
            <Text style={{ fontWeight: '700' }}>Qwen3 0.6B</Text> (Ultra-light, ~398MB, low memory)
          </Text>
        </View>
        <View style={styles.modelRow}>
          <CheckCircle2 size={16} color={colors.primary} />
          <Text style={[styles.modelText, { color: colors.text }]}>
            <Text style={{ fontWeight: '700' }}>Qwen3 1.7B</Text> (High reasoning & Tanglish depth)
          </Text>
        </View>
        <View style={styles.modelRow}>
          <CheckCircle2 size={16} color={colors.primary} />
          <Text style={[styles.modelText, { color: colors.text }]}>
            <Text style={{ fontWeight: '700' }}>Llama 3.2 1B</Text> (Meta's flagship instruction model)
          </Text>
        </View>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={[styles.ctaButton, { backgroundColor: colors.primary }]}
        onPress={onGetStarted}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaButtonText}>Detect Device & Get Started</Text>
        <ArrowRight size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 48,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoImage: {
    width: 68,
    height: 68,
    borderRadius: 16,
    marginBottom: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  featureList: {
    gap: 14,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  modelsSummaryCard: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 28,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modelText: {
    fontSize: 12,
    flex: 1,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#4D44E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

