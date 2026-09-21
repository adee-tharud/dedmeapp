import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, fontWeights, radii, spacing } from '../theme/tokens';

const { width } = Dimensions.get('window');

// ─── Sparkle component ────────────────────────────────────────────────────────
function Sparkle({
  size,
  style,
  delay,
}: {
  size: number;
  style: object;
  delay: number;
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            damping: 8,
            stiffness: 120,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 0.6,
            useNativeDriver: true,
            damping: 8,
            stiffness: 120,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [delay, opacity, scale]);

  return (
    <Animated.View style={[style, { transform: [{ scale }], opacity }]}>
      {/* Diamond / 4-point star shape using two rotated rectangles */}
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: size * 0.25,
            height: size,
            backgroundColor: colors.brand[700],
            borderRadius: 2,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size * 0.25,
            backgroundColor: colors.brand[700],
            borderRadius: 2,
          }}
        />
      </View>
    </Animated.View>
  );
}

// ─── Welcome Screen ───────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  // Entry animation values
  const mascotY = useRef(new Animated.Value(-30)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const textY = useRef(new Animated.Value(30)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.85)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  // Mascot floating animation
  const mascotFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── 1. Entry sequence ────────────────────────────────────────────────────
    Animated.sequence([
      Animated.parallel([
        Animated.spring(mascotY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 100 }),
        Animated.timing(mascotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(textY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 100 }),
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 180 }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();

    // ── 2. Continuous floating ───────────────────────────────────────────────
    Animated.loop(
      Animated.sequence([
        Animated.timing(mascotFloat, { toValue: -10, duration: 1800, useNativeDriver: true }),
        Animated.timing(mascotFloat, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const handleGetStarted = () => {
    router.push('/(auth)/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header logo row ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo1.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>deadme</Text>
      </View>

      {/* ── Mascot + circles ────────────────────────────────────────────────── */}
      <View style={styles.mascotSection}>
        {/* Outer glow circle */}
        <View style={styles.circleOuter}>
          {/* Inner circle */}
          <View style={styles.circleInner}>
            {/* Mascot */}
            <Animated.View
              style={{
                transform: [
                  { translateY: mascotY },
                  { translateY: mascotFloat },
                ],
                opacity: mascotOpacity,
              }}
            >
              <Image
                source={require('../../assets/logo1.png')}
                style={styles.mascot}
                resizeMode="contain"
              />
            </Animated.View>
          </View>
        </View>

        {/* Sparkles */}
        <Sparkle
          size={18}
          style={styles.sparkleTL}
          delay={0}
        />
        <Sparkle
          size={22}
          style={styles.sparkleBR}
          delay={400}
        />
      </View>

      {/* ── Text content ────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.textSection,
          { transform: [{ translateY: textY }], opacity: textOpacity },
        ]}
      >
        <Text style={styles.tagline}>A LITTLE PEACE OF MIND</Text>
        <Text style={styles.headline}>
          A gentle check‑in for people who live independently
        </Text>
        <Text style={styles.subtitle}>
          One small tap lets the people who care about you know everything is okay.
        </Text>
      </Animated.View>

      {/* ── CTA Button ──────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.btnWrapper,
          { transform: [{ scale: btnScale }], opacity: btnOpacity },
        ]}
      >
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.88}
          onPress={handleGetStarted}
          accessibilityRole="button"
          accessibilityLabel="Get started"
        >
          <Text style={styles.btnText}>Get started</Text>
          <Text style={styles.btnArrow}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CIRCLE_OUTER = width * 0.72;
const CIRCLE_INNER = width * 0.56;
const MASCOT_SIZE  = width * 0.40;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.sky.bg,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },
  headerTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
    letterSpacing: -0.5,
  },

  // Mascot
  mascotSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleOuter: {
    width: CIRCLE_OUTER,
    height: CIRCLE_OUTER,
    borderRadius: CIRCLE_OUTER / 2,
    backgroundColor: colors.sky.circle1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInner: {
    width: CIRCLE_INNER,
    height: CIRCLE_INNER,
    borderRadius: CIRCLE_INNER / 2,
    backgroundColor: colors.sky.circle2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascot: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },

  // Sparkles (positioned relative to mascotSection)
  sparkleTL: {
    position: 'absolute',
    top: '18%',
    left: '10%',
  },
  sparkleBR: {
    position: 'absolute',
    bottom: '20%',
    right: '8%',
  },

  // Text section
  textSection: {
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    marginBottom: spacing[8],
    gap: spacing[3],
  },
  tagline: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.brand[600],
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  headline: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    textAlign: 'center',
    lineHeight: fontSizes['3xl'] * 1.2,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    color: colors.grey[500],
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.55,
  },

  // Button
  btnWrapper: {
    paddingHorizontal: spacing[0],
  },
  btn: {
    backgroundColor: colors.brand[700],
    borderRadius: radii.full,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[8],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    shadowColor: colors.brand[800],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  btnText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.white,
    letterSpacing: 0.2,
  },
  btnArrow: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.white,
    marginTop: -2,
  },
});
