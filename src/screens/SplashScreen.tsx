import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { Cpu, ShieldCheck } from 'lucide-react-native';
import { ThemeColors } from '../theme/theme';

interface SplashScreenProps {
  colors: ThemeColors;
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ colors, onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: '#4D44E1' }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.iconCircle}>
          <Image
            source={require('../../assets/ai-brain-icon-1024.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>SaaS AI Brain</Text>
        <Text style={styles.subtitle}>Autonomous On-Device SLM Intelligence</Text>

        <View style={styles.badgeRow}>
          <View style={styles.pill}>
            <Cpu size={12} color="#FFFFFF" />
            <Text style={styles.pillText}>Edge LLM Engine</Text>
          </View>
          <View style={styles.pill}>
            <ShieldCheck size={12} color="#FFFFFF" />
            <Text style={styles.pillText}>100% Offline & Private</Text>
          </View>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Hardware-Accelerated Mobile Inference</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 26,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  logoImage: {
    width: 104,
    height: 104,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 36,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '500',
  },
});

