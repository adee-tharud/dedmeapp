/**
 * Caregiver Home — dashboard for users who are watching over someone.
 *
 * Shows every person the signed-in user is a caregiver for, along with
 * their latest check-in status.
 *
 * UI only — data is mocked for now. Functional wiring (useCaregiverWatch hook)
 * comes in the next phase.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme/tokens';
import { avatarInitial } from '@/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckInStatus = 'ok' | 'due' | 'overdue';

interface WatchedPerson {
  id: string;
  name: string;
  relationship: string;
  status: CheckInStatus;
  lastCheckIn: string | null;   // ISO string or null
  nextDue: string | null;       // human-readable e.g. "in 4 hours"
}

// ── Mock data (replaced by real hook in phase 2) ───────────────────────────────
const MOCK_WATCHED: WatchedPerson[] = [
  {
    id: '1',
    name: 'Alice Smith',
    relationship: 'Mother',
    status: 'ok',
    lastCheckIn: 'Today at 9:14 AM',
    nextDue: 'in 14 hours',
  },
  {
    id: '2',
    name: 'James Thornton',
    relationship: 'Friend',
    status: 'due',
    lastCheckIn: 'Yesterday at 8:30 PM',
    nextDue: 'now',
  },
];

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  CheckInStatus,
  { bg: string; text: string; icon: string; label: string }
> = {
  ok:      { bg: '#E6F9EE', text: '#1A8A47', icon: '✓', label: 'Checked in' },
  due:     { bg: '#FFF7E0', text: '#A87820', icon: '◷', label: 'Check-in due' },
  overdue: { bg: '#FEF2F2', text: '#CC0000', icon: '⚠', label: 'Overdue' },
};

function avatarColors(index: number) {
  const palette = [
    { bg: colors.brand[100], text: colors.brand[700] },
    { bg: '#FFF0E0', text: '#C07830' },
    { bg: '#F0E8FF', text: '#7B2FBE' },
    { bg: '#E0F7FA', text: '#00838F' },
  ];
  return palette[index % palette.length];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WatchedCard({ person, index }: { person: WatchedPerson; index: number }) {
  const sc = STATUS_CONFIG[person.status];
  const av = avatarColors(index);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${person.name}, ${sc.label}`}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.avatarText, { color: av.text }]}>
          {avatarInitial(person.name)}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.personName}>{person.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>
              {sc.icon}  {sc.label}
            </Text>
          </View>
        </View>
        <Text style={styles.relationship}>{person.relationship}</Text>
        {person.lastCheckIn && (
          <Text style={styles.lastCheckIn}>Last check-in: {person.lastCheckIn}</Text>
        )}
        {person.status !== 'ok' && person.nextDue && (
          <Text style={[styles.nextDue, { color: sc.text }]}>
            Due {person.nextDue}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.grey[300]} />
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CaregiverHomeScreen() {
  const [refreshing, setRefreshing] = useState(false);

  // TODO phase 2: replace with useCaregiverWatch(userId)
  const watched = MOCK_WATCHED;
  const isEmpty = watched.length === 0;

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO phase 2: trigger query refetch
    await new Promise(r => setTimeout(r, 800)); // simulate network
    setRefreshing(false);
  };

  const overdueCount = watched.filter(p => p.status === 'overdue').length;
  const dueCount     = watched.filter(p => p.status === 'due').length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Your watch</Text>
          <Text style={styles.headerTitle}>People you&apos;re watching</Text>
        </View>
        {/* Notification badge when someone is overdue */}
        {overdueCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{overdueCount}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand[600]}
          />
        }
      >
        {/* ── Alert banner when someone is overdue ─────────────────────────── */}
        {overdueCount > 0 && (
          <View style={styles.urgentBanner}>
            <Ionicons name="warning-outline" size={20} color="#CC0000" />
            <Text style={styles.urgentText}>
              {overdueCount === 1
                ? '1 person has missed their check-in.'
                : `${overdueCount} people have missed their check-ins.`
              }
            </Text>
          </View>
        )}

        {/* ── Due reminder ──────────────────────────────────────────────────── */}
        {dueCount > 0 && overdueCount === 0 && (
          <View style={styles.dueBanner}>
            <Ionicons name="time-outline" size={18} color="#A87820" />
            <Text style={styles.dueText}>
              {dueCount === 1
                ? '1 person has a check-in due.'
                : `${dueCount} people have check-ins due.`
              }
            </Text>
          </View>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No one linked yet</Text>
            <Text style={styles.emptySubtitle}>
              Ask the person you&apos;re watching over to send you an invite from their app.
              You&apos;ll appear here once they do.
            </Text>
          </View>
        )}

        {/* ── Cards ─────────────────────────────────────────────────────────── */}
        {!isEmpty && (
          <View style={styles.cardList}>
            {watched.map((person, i) => (
              <WatchedCard key={person.id} person={person} index={i} />
            ))}
          </View>
        )}

        {/* ── Info note ─────────────────────────────────────────────────────── */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.brand[500]} />
          <Text style={styles.infoNoteText}>
            You&apos;ll receive a push notification whenever someone checks in or misses a
            check-in. No action needed unless you see an overdue alert.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  headerLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: '#00838F',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.5,
  },
  alertBadge: {
    minWidth: 32, height: 32, borderRadius: 16,
    backgroundColor: '#CC0000',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing[2],
    marginTop: spacing[2],
  },
  alertBadgeText: {
    fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.white,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[4],
  },

  // Banners
  urgentBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#FEF2F2', borderRadius: radii.lg,
    borderWidth: 1, borderColor: '#FCA5A5', padding: spacing[4],
  },
  urgentText: {
    flex: 1, fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: '#CC0000',
  },
  dueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#FFFBEB', borderRadius: radii.lg,
    borderWidth: 1, borderColor: '#FDE68A', padding: spacing[4],
  },
  dueText: {
    flex: 1, fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: '#92400E',
  },

  // Empty state
  emptyState: {
    alignItems: 'center', gap: spacing[4],
    paddingVertical: spacing[10],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.brand[900],
  },
  emptySubtitle: {
    fontSize: fontSizes.md, color: colors.grey[500],
    textAlign: 'center', lineHeight: fontSizes.md * 1.5,
    paddingHorizontal: spacing[4],
  },

  // Cards
  cardList: { gap: spacing[3] },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    backgroundColor: colors.white, borderRadius: radii.xl, padding: spacing[5],
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 54, height: 54, borderRadius: radii.lg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold },
  cardContent: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  personName: {
    fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900],
  },
  statusBadge: {
    borderRadius: radii.full, paddingHorizontal: spacing[2], paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: fontWeights.bold },
  relationship: { fontSize: fontSizes.sm, color: colors.grey[500] },
  lastCheckIn: { fontSize: fontSizes.xs, color: colors.grey[400] },
  nextDue: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, marginTop: 2 },

  // Info note
  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    backgroundColor: colors.brand[50], borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.brand[100], padding: spacing[4],
  },
  infoNoteText: {
    flex: 1, fontSize: fontSizes.sm, color: colors.brand[700],
    lineHeight: fontSizes.sm * 1.55,
  },
});
