/**
 * Home screen — the main dashboard.
 *
 * Security Guide §5: all Supabase calls in feature service files.
 * Security Guide §6: data fetching via hook layer; user.id read once
 *   from auth context and passed into hooks — never called inside queries.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/auth';
import { useLatestCheckIn, useRecordCheckIn, isCheckedInToday, nextCheckInDue } from '@/features/checkin';
import { useCaregivers, useCaregiverWatch } from '@/features/contacts';
import { timeBasedGreeting } from '@/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WIDGET_SIZE = Math.min(SCREEN_WIDTH * 0.72, 276);
const HALO_SIZE = WIDGET_SIZE;
const RING_SIZE = Math.round(WIDGET_SIZE * 0.89);
const STROKE_WIDTH = 12;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const BUTTON_SIZE = Math.round(RING_SIZE * 0.78);

export default function HomeScreen() {
  // §6: read user.id once from auth context; pass into all hooks
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // ── Animations ─────────────────────────────────────────────────────────────
  const [scale] = useState(() => new Animated.Value(1));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // ── Data fetching — via hook layer, never raw service calls ───────────────
  const { data: profile }       = useProfile();
  const { data: latestCheckIn } = useLatestCheckIn(userId);
  const { data: caregivers }    = useCaregivers(userId);
  const { data: watchedList }   = useCaregiverWatch(userId);

  const isCaregiverOnly = (watchedList?.length ?? 0) > 0 && (caregivers?.length ?? 0) === 0;

  useEffect(() => {
    if (isCaregiverOnly) {
      router.replace('/(tabs)/caregiver-home');
    }
  }, [isCaregiverOnly]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const displayName      = profile?.name?.trim().split(' ')[0] ?? null;
  const checkedIn        = isCheckedInToday(latestCheckIn?.checked_in_at);
  const frequencyDays    = profile?.check_in_frequency_days ?? 1;
  const dueIn            = nextCheckInDue(latestCheckIn?.checked_in_at ?? null, frequencyDays);
  const primaryCaregiver = caregivers?.[0] ?? null;

  useEffect(() => {
    if (checkedIn) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [checkedIn, pulseAnim]);

  // ── Check-in mutation — via hook layer ────────────────────────────────────
  const checkInMutation = useRecordCheckIn(userId);

  const handleCheckIn = () => {
    if (checkedIn || checkInMutation.isPending || !userId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Tap pop animation
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, speed: 20 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 15 }),
    ]).start();

    checkInMutation.mutate();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isCaregiverOnly) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{timeBasedGreeting()}</Text>
            <Text style={styles.name}>Hey, {displayName ?? 'there'} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/(tabs)/settings')}
            accessibilityLabel="Profile settings"
          >
            <Text style={styles.avatarIcon}>◎</Text>
          </TouchableOpacity>
        </View>

        {/* ── Check-in Card (Matches new mockup, no mascot) ───────────────── */}
        <View style={styles.checkInCard}>
          {/* Top Status */}
          <Text style={[styles.statusText, checkedIn && styles.statusTextDone]}>
            {checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
          </Text>

          {/* Central Circular Button Widget */}
          <View style={styles.widgetWrapper}>
            {/* Outer soft halo */}
            <Animated.View
              style={[
                styles.outerHalo,
                checkedIn ? styles.outerHaloDone : { transform: [{ scale: pulseAnim }] },
              ]}
            />

            {/* SVG Ring Track & Progress Arc */}
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.svgRing}>
              {/* Background Track Circle */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={checkedIn ? '#D1FAE5' : '#D0E5FC'}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Active Blue Progress Arc */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={checkedIn ? colors.success : '#1654D1'}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                strokeDashoffset={CIRCUMFERENCE * (1 - (checkedIn ? 1 : 0.42))}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>

            {/* Main Tap Button */}
            <Animated.View style={{ transform: [{ scale }] }}>
              <TouchableOpacity
                style={[styles.checkInBtn, checkedIn && styles.checkInBtnDone]}
                onPress={handleCheckIn}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={checkedIn ? 'Checked in' : 'Tap to check in'}
                disabled={checkedIn || checkInMutation.isPending}
              >
                {checkInMutation.isPending ? (
                  <ActivityIndicator color={colors.white} size="large" />
                ) : checkedIn ? (
                  <View style={styles.btnContent}>
                    <Ionicons name="checkmark-sharp" size={38} color={colors.white} />
                    <Text style={styles.btnCheckedText}>Checked in</Text>
                  </View>
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnText}>Tap to</Text>
                    <Text style={styles.btnText}>check in</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Bottom Due Info */}
          <Text style={styles.dueText}>
            {checkedIn
              ? `Next check-in due in ${dueIn}`
              : dueIn === 'overdue'
                ? 'Check-in overdue — tap above!'
                : `Due in ${dueIn}`}
          </Text>
        </View>

        {/* ── Info cards ──────────────────────────────────────────────────── */}
        <View style={styles.cardsRow}>
          {/* Caregiver card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            accessibilityLabel={`Your caregiver: ${primaryCaregiver?.name ?? 'Not set'}`}
          >
            <View style={styles.cardIconWrap}>
              <Text style={styles.cardIcon}>◎</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Caregiver</Text>
              {primaryCaregiver ? (
                <View style={styles.cardValueRow}>
                  <Text style={styles.cardValue} numberOfLines={1}>
                    {primaryCaregiver.name}
                  </Text>
                  <View style={[
                    styles.statusDot,
                    primaryCaregiver.status === 'accepted'
                      ? styles.statusDotActive
                      : styles.statusDotPending,
                  ]} />
                </View>
              ) : (
                <Text style={[styles.cardValue, { color: colors.grey[400] }]}>
                  Not set
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Messages card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(tabs)/messages')}
            activeOpacity={0.85}
            accessibilityLabel="Messages"
          >
            <View style={[styles.cardIconWrap, styles.cardIconWarmWrap]}>
              <Text style={styles.cardIcon}>♡</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Messages</Text>
              <Text style={styles.cardValue}>My letters</Text>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Protection banner ────────────────────────────────────────────── */}
        <View style={styles.protectionBanner}>
          <Text style={styles.protectionIcon}>⊙</Text>
          <Text style={styles.protectionText}>
            {primaryCaregiver
              ? `${primaryCaregiver.name} is watching over you.`
              : 'Add a caregiver to activate your protection.'}
          </Text>
        </View>

        {/* ── Check-in error ───────────────────────────────────────────────── */}
        {checkInMutation.isError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>
              Could not record check-in. Please try again.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[8],
    gap: spacing[6],
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    paddingTop: spacing[3],
  },
  greeting: { fontSize: fontSizes.sm, color: colors.grey[500], fontWeight: fontWeights.medium },
  name: { fontSize: fontSizes['3xl'], fontWeight: fontWeights.extrabold, color: colors.brand[900], letterSpacing: -0.8 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarIcon: { fontSize: fontSizes.xl, color: colors.grey[500] },

  // Check-in card & circular widget (Solid white card)
  checkInCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 32,
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: '#3F5D7E',
    textTransform: 'uppercase',
  },
  statusTextDone: {
    color: '#15803D',
  },
  widgetWrapper: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing[1],
  },
  outerHalo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    backgroundColor: '#D9ECFD',
  },
  outerHaloDone: {
    backgroundColor: '#DCFCE7',
  },
  svgRing: {
    position: 'absolute',
  },
  checkInBtn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#1654D1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1654D1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  checkInBtnDone: {
    backgroundColor: colors.success,
    shadowColor: colors.success,
  },
  btnContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 27,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  btnCheckedText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.white,
    textAlign: 'center',
    marginTop: 2,
  },
  dueText: {
    fontSize: 19,
    fontWeight: fontWeights.bold,
    color: '#1B3C6E',
    letterSpacing: -0.3,
    textAlign: 'center',
  },

  // Cards
  cardsRow: { flexDirection: 'row', gap: spacing[3], width: '100%' },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWarmWrap: { backgroundColor: '#FFF0E0' },
  cardIcon: { fontSize: fontSizes.lg, color: colors.brand[600] },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: fontSizes.xs, color: colors.grey[400], fontWeight: fontWeights.medium },
  cardValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  cardValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.brand[900] },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusDotActive: { backgroundColor: colors.success },
  statusDotPending: { backgroundColor: colors.grey[300] },
  cardChevron: { fontSize: fontSizes.lg, color: colors.grey[300] },

  // Protection banner
  protectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[4],
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  protectionIcon: { fontSize: fontSizes.xl, color: colors.brand[600] },
  protectionText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.brand[800],
    fontWeight: fontWeights.medium,
  },

  // Error
  errorBanner: {
    width: '100%',
    backgroundColor: '#FFF0F0',
    borderRadius: radii.lg,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: '#FFCCCC',
  },
  errorText: { color: '#CC0000', fontSize: fontSizes.sm, textAlign: 'center' },
});
