/**
 * Welfare Check — the screen a caregiver sees when they tap the Stage 3
 * push notification. They have three possible actions:
 *
 *   ✅  "They're okay"    → sets status = 'person_okay'   → messages NOT sent
 *   ❌  "They need help"  → sets status = 'person_not_okay' → triggers message delivery
 *   (ignore / dismiss)   → 36-hour auto-timeout eventually delivers messages
 *
 * Route: peartap://welfare-check/[userId]
 * The push notification data payload carries { url: 'peartap://welfare-check/<userId>' }
 * which Expo Router resolves to this file.
 *
 * Deep-link setup note: `[userId]` maps to `useLocalSearchParams().userId`
 * because Expo Router uses file-based dynamic segments.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '@/theme/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import {
  usePendingWelfareCheck,
  useSubmitWelfareCheck,
} from '@/features/welfare-check';

// ── Types ──────────────────────────────────────────────────────────────────────

type Decision = 'person_okay' | 'person_not_okay';

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WelfareCheckScreen() {
  const { userId: monitoredUserId } = useLocalSearchParams<{ userId: string }>();
  const { user }                    = useAuth();
  const caregiverUserId             = user?.id ?? '';

  // Fetch the open confirmation row
  const { data: checkResult, isLoading, isError } = usePendingWelfareCheck(
    monitoredUserId ?? '',
    caregiverUserId,
  );

  const confirmation = checkResult?.confirmation;
  const statusState  = checkResult?.state ?? 'not_requested';
  const monitoredName =
    checkResult?.monitored_person_name?.trim() ||
    confirmation?.monitored_person_name?.trim() ||
    'Your contact';

  const submitMutation = useSubmitWelfareCheck(caregiverUserId);

  // ── Animations ──────────────────────────────────────────────────────────────
  const [fadeAnim]   = useState(() => new Animated.Value(0));
  const [slideAnim]  = useState(() => new Animated.Value(24));
  const [pulseAnim]  = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    // Pulse the warning icon
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDecision = (decision: Decision) => {
    if (!confirmation?.id || submitMutation.isPending) return;

    const confirmTitle   = decision === 'person_okay' ? 'Confirm they\'re safe' : 'Confirm emergency';
    const confirmMessage = decision === 'person_okay'
      ? 'This will cancel the emergency message delivery. Only confirm if you have personally verified they are safe.'
      : 'This will trigger immediate delivery of their emergency messages to their designated contacts.';

    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: decision === 'person_okay' ? 'Yes, they\'re safe' : 'Yes, send messages',
        style: decision === 'person_okay' ? 'default' : 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          submitMutation.mutate(
            { confirmationId: confirmation.id, decision },
            {
              onSuccess: () => {
                if (decision === 'person_okay') {
                  router.replace('/(tabs)/caregiver-home');
                } else {
                  router.replace('/(tabs)/caregiver-home');
                }
              },
              onError: (err: Error) => {
                Alert.alert(
                  'Error',
                  err.message || 'Could not submit your response. Please try again.',
                );
              },
            },
          );
        },
      },
    ]);
  };

  // ── Deadline countdown ───────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<string>('');
  useEffect(() => {
    if (!confirmation?.deadline_at) return;
    const tick = () => {
      const diff = new Date(confirmation.deadline_at).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Auto-sending now…'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setTimeLeft(`${h}h ${m}m remaining before auto-send`);
    };
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [confirmation?.deadline_at]);

  // ── Render states ────────────────────────────────────────────────────────────

  if (!monitoredUserId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.grey[400]} />
          <Text style={styles.centerStateText}>Invalid welfare check link.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.brand[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || statusState === 'not_requested') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <Ionicons name="shield-checkmark-outline" size={56} color={colors.brand[500]} />
          <Text style={styles.centerStateTitle}>No welfare check needed</Text>
          <Text style={styles.centerStateText}>
            {monitoredName} has missed their regular check-in, but is currently in their initial reminder window.
            {'\n\n'}
            The system has sent them a direct reminder. If they do not check in after their grace period, you will receive an alert to check on them.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)/caregiver-home')}
          >
            <Text style={styles.backBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (statusState === 'resolved' || !confirmation) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerState}>
          <Ionicons name="checkmark-circle-outline" size={56} color={colors.surface.successDark} />
          <Text style={styles.centerStateTitle}>Already resolved</Text>
          <Text style={styles.centerStateText}>
            This welfare check has already been responded to, or it may have expired.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)/caregiver-home')}
          >
            <Text style={styles.backBtnText}>Go home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Warning icon ──────────────────────────────────────────────────── */}
          <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.iconRing}>
              <Ionicons name="warning" size={40} color={colors.surface.warningDark} />
            </View>
          </Animated.View>

          {/* ── Heading ───────────────────────────────────────────────────────── */}
          <Text style={styles.title}>Welfare Check</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.nameHighlight}>{monitoredName}</Text>
            {' '}has not checked in and may need help.
          </Text>

          {/* ── Instructions ─────────────────────────────────────────────────── */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionRow}>
              <Ionicons name="call-outline" size={18} color={colors.brand[600]} style={styles.instrIcon} />
              <Text style={styles.instructionText}>
                Please try to contact <Text style={styles.nameHighlight}>{monitoredName}</Text> directly — by phone, message, or in person.
              </Text>
            </View>
            <View style={[styles.instructionRow, { marginTop: spacing[3] }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand[600]} style={styles.instrIcon} />
              <Text style={styles.instructionText}>
                Once you know their status, confirm below. Your response affects whether their emergency messages are sent.
              </Text>
            </View>
          </View>

          {/* ── Auto-send countdown ───────────────────────────────────────────── */}
          {timeLeft !== '' && (
            <View style={styles.countdownRow}>
              <Ionicons name="time-outline" size={14} color={colors.surface.warningDark} />
              <Text style={styles.countdownText}>{timeLeft}</Text>
            </View>
          )}

          {/* ── Decision buttons ──────────────────────────────────────────────── */}
          <View style={styles.buttonsSection}>
            {/* ✅ Okay */}
            <TouchableOpacity
              id="welfare-check-okay-btn"
              style={[styles.decisionBtn, styles.okayBtn, submitMutation.isPending && styles.btnDisabled]}
              onPress={() => handleDecision('person_okay')}
              disabled={submitMutation.isPending}
              activeOpacity={0.85}
            >
              <View style={styles.btnIconWrap}>
                <Ionicons name="checkmark-circle" size={26} color="#fff" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.btnLabel}>They&apos;re okay</Text>
                <Text style={styles.btnSub}>I&apos;ve confirmed they are safe and well</Text>
              </View>
            </TouchableOpacity>

            {/* ❌ Not okay */}
            <TouchableOpacity
              id="welfare-check-not-okay-btn"
              style={[styles.decisionBtn, styles.notOkayBtn, submitMutation.isPending && styles.btnDisabled]}
              onPress={() => handleDecision('person_not_okay')}
              disabled={submitMutation.isPending}
              activeOpacity={0.85}
            >
              <View style={[styles.btnIconWrap, styles.notOkayIconWrap]}>
                <Ionicons name="alert-circle" size={26} color="#fff" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={[styles.btnLabel, styles.notOkayLabel]}>They need help</Text>
                <Text style={[styles.btnSub, styles.notOkaySub]}>
                  Send their emergency messages now
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {submitMutation.isPending && (
            <ActivityIndicator
              size="small"
              color={colors.brand[500]}
              style={{ marginTop: spacing[4] }}
            />
          )}

          {/* ── Dismiss note ──────────────────────────────────────────────────── */}
          <Text style={styles.dismissNote}>
            If you don&apos;t respond, their emergency messages will be sent automatically when the timer runs out.
          </Text>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.sky.bg,
  },
  container: {
    flex: 1,
  },
  scroll: {
    padding: spacing[5],
    paddingBottom: spacing[10],
    alignItems: 'center',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    gap: spacing[4],
  },
  centerStateTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.grey[900],
    textAlign: 'center',
  },
  centerStateText: {
    fontSize: fontSizes.sm,
    color: colors.grey[600],
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtn: {
    marginTop: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    backgroundColor: colors.brand[600],
    borderRadius: radii.md,
  },
  backBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.white,
  },

  // Icon
  iconWrap: {
    marginTop: spacing[6],
    marginBottom: spacing[4],
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface.warningSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface.warningDark + '30',
    ...shadows.md,
  },

  // Heading
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.grey[900],
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[5],
    paddingHorizontal: spacing[2],
  },
  nameHighlight: {
    fontWeight: fontWeights.semibold,
    color: colors.grey[900],
  },

  // Instruction card
  instructionCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.grey[200],
    marginBottom: spacing[4],
    ...shadows.sm,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instrIcon: {
    marginRight: spacing[3],
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.grey[600],
    lineHeight: 20,
  },

  // Countdown
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[5],
    backgroundColor: colors.surface.warningSubtle,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radii.full,
  },
  countdownText: {
    fontSize: fontSizes.xs,
    color: colors.surface.warningDark,
    fontWeight: fontWeights.medium,
  },

  // Decision buttons
  buttonsSection: {
    width: '100%',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  decisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    padding: spacing[4],
    gap: spacing[4],
    ...shadows.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  okayBtn: {
    backgroundColor: colors.surface.successDark,
  },
  notOkayBtn: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.surface.dangerText,
  },
  btnIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notOkayIconWrap: {
    backgroundColor: colors.surface.dangerText,
  },
  btnTextWrap: {
    flex: 1,
  },
  btnLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.white,
    marginBottom: 2,
  },
  btnSub: {
    fontSize: fontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
  },
  notOkayLabel: {
    color: colors.surface.dangerText,
  },
  notOkaySub: {
    color: colors.grey[600],
  },

  // Dismiss note
  dismissNote: {
    fontSize: fontSizes.xs,
    color: colors.grey[400],
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
});
