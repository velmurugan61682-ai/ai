import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, AccessibilityInfo } from 'react-native';
import Svg, {
  Rect,
  Circle,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  Ellipse,
} from 'react-native-svg';
import { TiyoState } from './TiyoActionEngine';
import { TiyoAction, TiyoEmotion } from './types';
import { ThemeColors } from '../theme/theme';

export interface TiyoAvatarProps {
  state: TiyoState;
  action: TiyoAction;
  emotion: TiyoEmotion;
  colors: ThemeColors;
  size?: number;
  mouthOpenRatio?: number; // 0 (closed) to 1 (fully open) during speech
}

export const TiyoAvatar: React.FC<TiyoAvatarProps> = ({
  state,
  action,
  emotion,
  colors,
  size = 220,
  mouthOpenRatio = 0,
}) => {
  // Animation values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current; // 1 = open, 0.05 = closed
  const headRotateAnim = useRef(new Animated.Value(0)).current; // degrees
  const armWaveAnim = useRef(new Animated.Value(0)).current; // right arm angle
  const armThumbsAnim = useRef(new Animated.Value(0)).current; // thumbs up arm
  const pulseAnim = useRef(new Animated.Value(1)).current; // antenna & ear glow
  const mouthScaleY = useRef(new Animated.Value(0.2)).current;

  // Accessibility reduced motion check
  const isReducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReducedMotion.current = enabled;
    });
  }, []);

  // 1. Idle Gentle Floating Bob Loop
  useEffect(() => {
    if (isReducedMotion.current) return;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [floatAnim]);

  // 2. Periodic Natural Eye Blinking Loop
  useEffect(() => {
    if (isReducedMotion.current) return;
    let blinkTimer: any = null;

    const scheduleBlink = () => {
      const delay = 2500 + Math.random() * 3000;
      blinkTimer = setTimeout(() => {
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 0.08,
            duration: 80,
            useNativeDriver: true,
          }),
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start(() => {
          scheduleBlink();
        });
      }, delay);
    };

    scheduleBlink();
    return () => clearTimeout(blinkTimer);
  }, [blinkAnim]);

  // 3. State & Gesture Driven Animations
  useEffect(() => {
    if (isReducedMotion.current) return;

    // Reset arm / head animations
    armWaveAnim.setValue(0);
    armThumbsAnim.setValue(0);
    headRotateAnim.setValue(0);
    pulseAnim.setValue(1);

    // Wave / Greet Gesture
    if (action === 'wave' || action === 'greet' || action === 'goodbye') {
      const waveLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(armWaveAnim, {
            toValue: -35,
            duration: 220,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(armWaveAnim, {
            toValue: 5,
            duration: 220,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        { iterations: 6 }
      );
      waveLoop.start();
    }

    // Thumbs Up Gesture
    if (action === 'thumbs_up') {
      Animated.sequence([
        Animated.timing(armThumbsAnim, {
          toValue: -40,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Thinking State: slight head tilt + antenna pulsing
    if (state === 'thinking') {
      Animated.timing(headRotateAnim, {
        toValue: 7,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      const thinkPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.8, duration: 400, useNativeDriver: true }),
        ])
      );
      thinkPulse.start();
      return () => thinkPulse.stop();
    }

    // Listening State: head tilt other way + antenna bright
    if (state === 'listening') {
      Animated.timing(headRotateAnim, {
        toValue: -6,
        duration: 350,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();

      const listenPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 300, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 300, useNativeDriver: true }),
        ])
      );
      listenPulse.start();
      return () => listenPulse.stop();
    }
  }, [state, action]);

  // 4. Drive Mouth Scale from mouthOpenRatio (Phase 3 Voice Out)
  useEffect(() => {
    if (state === 'speaking') {
      Animated.timing(mouthScaleY, {
        toValue: Math.max(0.2, mouthOpenRatio),
        duration: 60,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(mouthScaleY, {
        toValue: emotion === 'happy' || action === 'smile' ? 0.45 : 0.2,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [state, mouthOpenRatio, emotion, action]);

  // Dynamic eye & glow colors based on emotion & state
  let visorGlowColor = '#00F0FF'; // Cyber cyan default
  if (state === 'thinking') visorGlowColor = '#FFD000'; // Amber
  if (state === 'listening') visorGlowColor = '#00FF88'; // Emerald
  if (emotion === 'happy' || action === 'smile') visorGlowColor = '#00FFCC';
  if (emotion === 'excited') visorGlowColor = '#FF00E5'; // Magenta
  if (emotion === 'sad') visorGlowColor = '#3B82F6'; // Blue

  const headInterpolate = headRotateAnim.interpolate({
    inputRange: [-10, 10],
    outputRange: ['-10deg', '10deg'],
  });

  const waveInterpolate = armWaveAnim.interpolate({
    inputRange: [-45, 45],
    outputRange: ['-45deg', '45deg'],
  });

  const thumbsInterpolate = armThumbsAnim.interpolate({
    inputRange: [-45, 45],
    outputRange: ['-45deg', '45deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ translateY: floatAnim }],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
        <Defs>
          <LinearGradient id="robotBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="100%" stopColor="#E2E8F0" />
          </LinearGradient>
          <LinearGradient id="visorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#0F172A" />
            <Stop offset="100%" stopColor="#1E293B" />
          </LinearGradient>
          <LinearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#6366F1" />
            <Stop offset="100%" stopColor="#8B5CF6" />
          </LinearGradient>
        </Defs>

        {/* Shadow under robot */}
        <Ellipse cx="100" cy="188" rx="45" ry="7" fill="rgba(0,0,0,0.14)" />

        {/* Torso */}
        <Rect
          x="70"
          y="118"
          width="60"
          height="55"
          rx="18"
          fill="url(#robotBodyGrad)"
          stroke="#CBD5E1"
          strokeWidth="3"
        />

        {/* Chest Plate with Status LED */}
        <Rect x="82" y="130" width="36" height="24" rx="8" fill="#0F172A" />
        <Circle cx="100" cy="142" r="5" fill={visorGlowColor} />

        {/* Left Arm (Resting) */}
        <Rect
          x="50"
          y="124"
          width="14"
          height="38"
          rx="7"
          fill="url(#robotBodyGrad)"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <Circle cx="57" cy="165" r="7" fill="#94A3B8" />

        {/* Right Arm (Waving or Resting) */}
        <Rect
          x="136"
          y="124"
          width="14"
          height="38"
          rx="7"
          fill="url(#robotBodyGrad)"
          stroke="#CBD5E1"
          strokeWidth="2"
        />
        <Circle cx="143" cy="165" r="7" fill="#94A3B8" />

        {/* Neck */}
        <Rect x="90" y="108" width="20" height="12" rx="4" fill="#94A3B8" />

        {/* Head Group with Rotation */}
        <G transform="translate(100, 70)">
          {/* Antenna Stem */}
          <Rect x="-3" y="-55" width="6" height="20" rx="3" fill="#94A3B8" />
          {/* Antenna Orb */}
          <Circle cx="0" cy="-56" r="7" fill={visorGlowColor} />

          {/* Ears / Side Audio Sensors */}
          <Rect x="-58" y="-18" width="8" height="26" rx="4" fill="#94A3B8" />
          <Rect x="50" y="-18" width="8" height="26" rx="4" fill="#94A3B8" />
          <Circle cx="-54" cy="-5" r="3" fill={visorGlowColor} />
          <Circle cx="54" cy="-5" r="3" fill={visorGlowColor} />

          {/* Head Base */}
          <Rect
            x="-50"
            y="-38"
            width="100"
            height="76"
            rx="24"
            fill="url(#robotBodyGrad)"
            stroke="#CBD5E1"
            strokeWidth="3.5"
          />

          {/* Visor Screen */}
          <Rect
            x="-40"
            y="-26"
            width="80"
            height="46"
            rx="16"
            fill="url(#visorGrad)"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Left Eye */}
          {emotion === 'sad' ? (
            <Path
              d="M -26 -8 Q -20 -14 -14 -10"
              stroke={visorGlowColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : emotion === 'happy' || action === 'smile' ? (
            <Path
              d="M -26 -8 Q -20 -15 -14 -8"
              stroke={visorGlowColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : (
            <Ellipse
              cx="-20"
              cy="-8"
              rx="6"
              ry="7"
              fill={visorGlowColor}
            />
          )}

          {/* Right Eye */}
          {emotion === 'sad' ? (
            <Path
              d="M 14 -10 Q 20 -14 26 -8"
              stroke={visorGlowColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : emotion === 'happy' || action === 'smile' ? (
            <Path
              d="M 14 -8 Q 20 -15 26 -8"
              stroke={visorGlowColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : (
            <Ellipse
              cx="20"
              cy="-8"
              rx="6"
              ry="7"
              fill={visorGlowColor}
            />
          )}

          {/* Mouth */}
          {state === 'speaking' ? (
            <Ellipse
              cx="0"
              cy="10"
              rx="12"
              ry={Math.max(2, mouthOpenRatio * 8)}
              fill={visorGlowColor}
            />
          ) : emotion === 'happy' || action === 'smile' ? (
            <Path
              d="M -10 8 Q 0 16 10 8"
              stroke={visorGlowColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : emotion === 'sad' ? (
            <Path
              d="M -8 13 Q 0 7 8 13"
              stroke={visorGlowColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <Rect x="-8" y="9" width="16" height="3" rx="1.5" fill={visorGlowColor} />
          )}
        </G>
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
});
