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
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfile } from '@/features/auth';
import { useLatestCheckIn, useRecordCheckIn, isCheckedInToday, nextCheckInDue } from '@/features/checkin';
import { useCaregivers, useCaregiverWatch } from '@/features/contacts';
import { timeBasedGreeting } from '@/utils';

const { width } = Dimensions.get('window');
const BTN_SIZE = width * 0.62;

export default function HomeScreen() {
  // §6: read user.id once from auth context; pass into all hooks
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // ── Animations ─────────────────────────────────────────────────────────────
  const [scale]         = useState(() => new Animated.Value(1));
  const [pulse1]        = useState(() => new Animated.Value(1));
  const [pulse2]        = useState(() => new Animated.Value(1));
  const [pulse1Opacity] = useState(() => new Animated.Value(0.35));
  const [pulse2Opacity] = useState(() => new Animated.Value(0.2));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse1, { toValue: 1.18, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulse1Opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse1, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulse1Opacity, { toValue: 0.35, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.parallel([
          Animated.timing(pulse2, { toValue: 1.18, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulse2Opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse2, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(pulse2Opacity, { toValue: 0.2, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    loop2.start();
    return () => { loop.stop(); loop2.stop(); };
  }, [pulse1, pulse1Opacity, pulse2, pulse2Opacity]);

  // ── Data fetching — via hook layer, never raw service calls ───────────────
  const { data: profile }      = useProfile();
  const { data: latestCheckIn } = useLatestCheckIn(userId);
  const { data: caregivers }   = useCaregivers(userId);
  const { data: watchedList }  = useCaregiverWatch(userId);

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

  // ── Check-in mutation — via hook layer ────────────────────────────────────
  const checkInMutation = useRecordCheckIn(userId);

  const handleCheckIn = () => {
    if (checkedIn || checkInMutation.isPending || !userId) return;

    // Tap pop animation
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1.06, useNativeDriver: true, speed: 20 }),
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

        {/* ── Check-in button ──────────────────────────────────────────────── */}
        <View style={styles.checkInSection}>
          {/* Outer pulse rings */}
          <Animated.View
            style={[
              styles.pulseRing,
              { transform: [{ scale: pulse2 }], opacity: pulse2Opacity },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRingInner,
              { transform: [{ scale: pulse1 }], opacity: pulse1Opacity },
            ]}
          />

          {/* The big button */}
          <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
              style={[styles.checkInBtn, checkedIn && styles.checkInBtnDone]}
              onPress={handleCheckIn}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={checkedIn ? 'Checked in' : "Check in — I'm okay"}
              disabled={checkedIn || checkInMutation.isPending}
            >
              {checkInMutation.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Image
                  source={require('../../../assets/logo1.png')}
                  style={styles.mascot}
                  resizeMode="contain"
                />
              )}
              <Text style={styles.checkInLabel}>
                {checkedIn ? '✓ Checked in!' : "I'm okay"}
              </Text>
              <Text style={styles.checkInSub}>
                {checkedIn ? 'See you tomorrow 👋' : 'Tap to check in'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* ── Next due ────────────────────────────────────────────────────── */}
        <View style={styles.dueRow}>
          <Text style={styles.dueIcon}>◷</Text>
          <Text style={styles.dueText}>
            {checkedIn
              ? <>Next check-in due in <Text style={styles.dueBold}>{dueIn}</Text></>
              : <Text style={styles.dueBold}>Check-in due — tap the button!</Text>
            }
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

const PULSE_SIZE = BTN_SIZE * 1.28;

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

  // Check-in section
  checkInSection: {
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    backgroundColor: colors.brand[300],
  },
  pulseRingInner: {
    width: PULSE_SIZE * 0.86,
    height: PULSE_SIZE * 0.86,
    borderRadius: (PULSE_SIZE * 0.86) / 2,
    backgroundColor: colors.brand[400],
  },
  checkInBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    backgroundColor: colors.brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    shadowColor: colors.brand[800],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  checkInBtnDone: {
    backgroundColor: colors.success,
  },
  mascot: { width: BTN_SIZE * 0.42, height: BTN_SIZE * 0.42 },
  checkInLabel: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.extrabold,
    color: colors.white,
    letterSpacing: -0.3,
  },
  checkInSub: {
    fontSize: fontSizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: fontWeights.medium,
  },

  // Due timer
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  dueIcon: { fontSize: fontSizes.lg, color: colors.grey[400] },
  dueText: { fontSize: fontSizes.sm, color: colors.grey[500] },
  dueBold: { fontWeight: fontWeights.bold, color: colors.brand[800] },

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
