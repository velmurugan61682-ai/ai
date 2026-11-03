import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity, Text } from 'react-native';
import { ThemeColors } from '../theme/theme';

export interface SpeakingRobotProps {
  status: 'idle' | 'speaking' | 'listening';
  colors: ThemeColors;
  onPress?: () => void;
  size?: number;
}

export const SpeakingRobot: React.FC<SpeakingRobotProps> = ({
  status,
  colors,
  onPress,
  size = 64,
}) => {
  // Floating bob animation
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Mouth equalizer bars for speaking
  const mouthBar1 = useRef(new Animated.Value(3)).current;
  const mouthBar2 = useRef(new Animated.Value(8)).current;
  const mouthBar3 = useRef(new Animated.Value(14)).current;
  const mouthBar4 = useRef(new Animated.Value(8)).current;
  const mouthBar5 = useRef(new Animated.Value(3)).current;

  // Eye pulse / blink
  const eyeScale = useRef(new Animated.Value(1)).current;

  // Antenna LED pulse
  const antennaPulse = useRef(new Animated.Value(0.7)).current;

  // Floating Loop
  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  // Speaking mouth wave animation
  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (status === 'speaking') {
      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(mouthBar1, { toValue: 12, duration: 160, useNativeDriver: false }),
            Animated.timing(mouthBar1, { toValue: 4, duration: 160, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(mouthBar2, { toValue: 16, duration: 130, useNativeDriver: false }),
            Animated.timing(mouthBar2, { toValue: 6, duration: 130, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(mouthBar3, { toValue: 18, duration: 110, useNativeDriver: false }),
            Animated.timing(mouthBar3, { toValue: 5, duration: 110, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(mouthBar4, { toValue: 15, duration: 140, useNativeDriver: false }),
            Animated.timing(mouthBar4, { toValue: 6, duration: 140, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(mouthBar5, { toValue: 11, duration: 170, useNativeDriver: false }),
            Animated.timing(mouthBar5, { toValue: 3, duration: 170, useNativeDriver: false }),
          ]),
          Animated.sequence([
            Animated.timing(antennaPulse, { toValue: 1.0, duration: 250, useNativeDriver: true }),
            Animated.timing(antennaPulse, { toValue: 0.4, duration: 250, useNativeDriver: true }),
          ]),
        ])
      );
      animLoop.start();
    } else {
      // Reset mouth bars to subtle smile line
      Animated.parallel([
        Animated.timing(mouthBar1, { toValue: 3, duration: 200, useNativeDriver: false }),
        Animated.timing(mouthBar2, { toValue: 4, duration: 200, useNativeDriver: false }),
        Animated.timing(mouthBar3, { toValue: 4, duration: 200, useNativeDriver: false }),
        Animated.timing(mouthBar4, { toValue: 4, duration: 200, useNativeDriver: false }),
        Animated.timing(mouthBar5, { toValue: 3, duration: 200, useNativeDriver: false }),
        Animated.timing(antennaPulse, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    return () => {
      animLoop?.stop();
    };
  }, [status, mouthBar1, mouthBar2, mouthBar3, mouthBar4, mouthBar5, antennaPulse]);

  // Periodic eye blink
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (status !== 'speaking') {
        Animated.sequence([
          Animated.timing(eyeScale, { toValue: 0.1, duration: 120, useNativeDriver: true }),
          Animated.timing(eyeScale, { toValue: 1.0, duration: 120, useNativeDriver: true }),
        ]).start();
      }
    }, 3800);

    return () => clearInterval(blinkInterval);
  }, [status, eyeScale]);

  const antennaColor =
    status === 'speaking'
      ? '#10B981'
      : status === 'listening'
      ? '#EF4444'
      : colors.primary;

  const mouthColor =
    status === 'speaking'
      ? '#10B981'
      : status === 'listening'
      ? '#EF4444'
      : '#38BDF8';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, { width: size + 20 }]}
    >
      <Animated.View
        style={[
          styles.robotWrapper,
          {
            transform: [{ translateY: floatAnim }],
          },
        ]}
      >
        {/* Antenna */}
        <View style={styles.antennaStem}>
          <Animated.View
            style={[
              styles.antennaTip,
              {
                backgroundColor: antennaColor,
                opacity: antennaPulse,
                shadowColor: antennaColor,
              },
            ]}
          />
          <View style={[styles.antennaPole, { backgroundColor: colors.textSubtle }]} />
        </View>

        {/* Robot Head */}
        <View
          style={[
            styles.headBox,
            {
              backgroundColor: colors.card,
              borderColor: status === 'speaking' ? '#10B981' : colors.cardBorder,
              borderWidth: status === 'speaking' ? 2 : 1.5,
              shadowColor: colors.primary,
            },
          ]}
        >
          {/* Ear bolts */}
          <View style={[styles.earLeft, { backgroundColor: colors.primary }]} />
          <View style={[styles.earRight, { backgroundColor: colors.primary }]} />

          {/* Visor Screen */}
          <View style={styles.visorScreen}>
            {/* Eyes */}
            <View style={styles.eyesRow}>
              <Animated.View
                style={[
                  styles.eye,
                  {
                    backgroundColor: status === 'listening' ? '#EF4444' : '#38BDF8',
                    transform: [{ scaleY: eyeScale }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.eye,
                  {
                    backgroundColor: status === 'listening' ? '#EF4444' : '#38BDF8',
                    transform: [{ scaleY: eyeScale }],
                  },
                ]}
              />
            </View>

            {/* Equalizer / Smile Mouth */}
            <View style={styles.mouthRow}>
              <Animated.View style={[styles.mouthBar, { height: mouthBar1, backgroundColor: mouthColor }]} />
              <Animated.View style={[styles.mouthBar, { height: mouthBar2, backgroundColor: mouthColor }]} />
              <Animated.View style={[styles.mouthBar, { height: mouthBar3, backgroundColor: mouthColor }]} />
              <Animated.View style={[styles.mouthBar, { height: mouthBar4, backgroundColor: mouthColor }]} />
              <Animated.View style={[styles.mouthBar, { height: mouthBar5, backgroundColor: mouthColor }]} />
            </View>
          </View>
        </View>

        {/* Status Pill Badge */}
        <View
          style={[
            styles.statusPill,
            status === 'speaking'
              ? { backgroundColor: '#D1FAE5' }
              : status === 'listening'
              ? { backgroundColor: '#FEE2E2' }
              : { backgroundColor: colors.surface },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              status === 'speaking'
                ? { color: '#065F46' }
                : status === 'listening'
                ? { color: '#991B1B' }
                : { color: colors.textSubtle },
            ]}
          >
            {status === 'speaking' ? 'Speaking...' : status === 'listening' ? 'Listening...' : 'Qwen Robot'}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  robotWrapper: {
    alignItems: 'center',
  },
  antennaStem: {
    alignItems: 'center',
    marginBottom: -1,
  },
  antennaTip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
  },
  antennaPole: {
    width: 2.5,
    height: 6,
  },
  headBox: {
    width: 54,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earLeft: {
    position: 'absolute',
    left: -4,
    top: 14,
    width: 3.5,
    height: 12,
    borderRadius: 2,
  },
  earRight: {
    position: 'absolute',
    right: -4,
    top: 14,
    width: 3.5,
    height: 12,
    borderRadius: 2,
  },
  visorScreen: {
    width: 44,
    height: 32,
    backgroundColor: '#0F172A',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 3,
    gap: 4,
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 26,
    alignItems: 'center',
  },
  eye: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  mouthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 14,
  },
  mouthBar: {
    width: 3,
    borderRadius: 1.5,
  },
  statusPill: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
});

