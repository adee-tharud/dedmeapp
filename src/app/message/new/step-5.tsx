import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../../components/ui/Button';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../../theme/tokens';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.62;

export default function Step5Screen() {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const sparkleRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pop-in animation on mount
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12, stiffness: 120 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Sparkle spin
    Animated.loop(
      Animated.timing(sparkleRotate, { toValue: 1, duration: 3000, useNativeDriver: true }),
    ).start();
  }, []);

  const sparkleTransform = sparkleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity }]}>
        {/* ── Mascot circle ─────────────────────────────────────────────────  */}
        <Animated.View style={[styles.circleWrap, { transform: [{ scale }] }]}>
          <View style={styles.circle}>
            <Image
              source={require('../../../../assets/logo1.png')}
              style={styles.mascot}
              resizeMode="contain"
            />
          </View>
          {/* Sparkle icon */}
          <Animated.View style={[styles.sparkle, { transform: [{ rotate: sparkleTransform }] }]}>
            <Ionicons name="sparkles" size={24} color={colors.brand[600]} />
          </Animated.View>
        </Animated.View>

        {/* ── Text ──────────────────────────────────────────────────────────  */}
        <View style={styles.textBlock}>
          <Text style={styles.eyebrow}>SAFELY TUCKED AWAY</Text>
          <Text style={styles.title}>Your message is ready</Text>
          <Text style={styles.subtitle}>
            It stays private unless your complete check-in plan finishes without an answer.
          </Text>
        </View>

        {/* ── Info note ─────────────────────────────────────────────────────  */}
        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand[500]} />
          <Text style={styles.infoNoteText}>
            You can change or deactivate it anytime before it sends.
          </Text>
        </View>

        <View style={styles.spacer} />

        {/* ── Back button ───────────────────────────────────────────────────  */}
        <Button
          label="Back to messages"
          onPress={() => router.replace('/(tabs)/messages')}
          style={styles.backBtn}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },
  container: {
    flex: 1, alignItems: 'center',
    paddingHorizontal: spacing[6], paddingVertical: spacing[8], gap: spacing[6],
  },

  // Mascot
  circleWrap: { alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: colors.brand[100], alignItems: 'center', justifyContent: 'center',
  },
  mascot: { width: CIRCLE_SIZE * 0.65, height: CIRCLE_SIZE * 0.65 },
  sparkle: { position: 'absolute', top: 8, right: -4 },

  // Text
  textBlock: { alignItems: 'center', gap: spacing[3] },
  eyebrow: {
    fontSize: fontSizes.xs, fontWeight: fontWeights.bold,
    color: colors.brand[600], letterSpacing: 1.5, textAlign: 'center',
  },
  title: {
    fontSize: fontSizes['4xl'], fontWeight: fontWeights.extrabold,
    color: colors.brand[900], letterSpacing: -0.8,
    textAlign: 'center', lineHeight: fontSizes['4xl'] * 1.15,
  },
  subtitle: {
    fontSize: fontSizes.md, color: colors.grey[500],
    textAlign: 'center', lineHeight: fontSizes.md * 1.55,
  },

  // Info note
  infoNote: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.brand[50], borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.brand[100],
    padding: spacing[4], width: '100%',
  },
  infoNoteText: { flex: 1, fontSize: fontSizes.sm, color: colors.brand[700], lineHeight: fontSizes.sm * 1.5 },

  spacer: { flex: 1 },
  backBtn: { width: '100%', borderRadius: radii.full },
});
