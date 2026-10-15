/**
 * Caregiver Home — dashboard for users who are watching over someone.
 *
 * Shows every person the signed-in user is a caregiver for, along with
 * their latest check-in status.
 *
 * Includes a "+" button in the header that opens the Add Invite Code
 * bottom sheet modal — so a signed-in caregiver can redeem additional
 * invite tokens without going through the sign-up flow again.
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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme/tokens';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { avatarInitial, computeWatchStatus, timeUntilDue } from '@/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { useCaregiverWatch, useAcceptCaregiverInvite } from '@/features/contacts';

// ── Types ─────────────────────────────────────────────────────────────────────

type CheckInStatus = 'ok' | 'due' | 'overdue';

interface WatchedPerson {
  id: string;
  name: string;
  relationship: string;
  status: CheckInStatus;
  lastCheckIn: string | null;
  nextDue: string | null;
}



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

// ── Add Invite Code Bottom Sheet ──────────────────────────────────────────────

// ── Sheet component (unchanged) ————————————————————————————————————————

function AddInviteSheet({
  visible,
  onClose,
  onSubmit,
  isPending,
  submitError,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (token: string) => void;
  isPending: boolean;
  submitError: string;
}) {
  const insets = useSafeAreaInsets();
  const [token, setToken]     = useState('');
  const [backdropOpacity]     = useState(() => new Animated.Value(0));

  // Animate backdrop when visible changes
  React.useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, backdropOpacity]);

  const trimmedToken = token.trim();
  const canSubmit    = trimmedToken.length === 36; // UUID length

  const handleClose = () => {
    setToken('');
    onClose();
  };

  const handleLink = () => {
    if (!canSubmit || isPending) return;
    onSubmit(trimmedToken);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* ── Dimmed backdrop — tap to close ──────────────────────────────────── */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* ── Sheet ───────────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetKav}
        pointerEvents="box-none"
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing[4] }]}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Header row */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIconWrap}>
              <Ionicons name="key-outline" size={22} color="#00838F" />
            </View>
            <View style={styles.sheetHeaderText}>
              <Text style={styles.sheetTitle}>Add a person to watch</Text>
              <Text style={styles.sheetSubtitle}>
                Enter the invite code from their email to link your account.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.sheetCloseBtn}
              onPress={handleClose}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={20} color={colors.grey[500]} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.sheetDivider} />

          {/* Input group */}
          <View style={styles.sheetBody}>
            <Input
              label="Invite code"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Validation hint */}
            {trimmedToken.length > 0 && !canSubmit && (
              <View style={styles.hintBanner}>
                <Ionicons name="information-circle-outline" size={15} color="#A87820" />
                <Text style={styles.hintText}>
                  Code should be 36 characters. Check your email and try again.
                </Text>
              </View>
            )}

            {/* Link button */}
            <Button
              label={isPending ? 'Linking…' : 'Link account'}
              onPress={handleLink}
              disabled={!canSubmit || isPending}
              loading={isPending}
            />

            {/* Error banner */}
            {submitError !== '' && (
              <View style={styles.sheetErrorBanner}>
                <Ionicons name="alert-circle-outline" size={15} color="#CC0000" />
                <Text style={styles.sheetErrorText}>{submitError}</Text>
              </View>
            )}

            {/* Info note */}
            <View style={styles.sheetInfoNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.brand[500]} />
              <Text style={styles.sheetInfoText}>
                Each invite code is single-use. Once linked, the person will be
                notified that you joined their circle.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Watched person card ───────────────────────────────────────────────────────

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
      <View style={[styles.avatar, { backgroundColor: av.bg }]}>
        <Text style={[styles.avatarText, { color: av.text }]}>
          {avatarInitial(person.name)}
        </Text>
      </View>

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
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const {
    data: watchedList,
    refetch,
  } = useCaregiverWatch(userId);

  const { mutate: acceptInvite, isPending: acceptPending } = useAcceptCaregiverInvite(userId);

  const [refreshing, setRefreshing]     = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetError, setSheetError]     = useState('');

  // Map WatchedPersonRow → WatchedPerson (UI shape)
  const watched: WatchedPerson[] = (watchedList ?? []).map(row => {
    const lastAt = row.lastCheckInAt;
    const status = computeWatchStatus(lastAt, row.frequencyDays ?? 1);

    // Display the monitored person's name:
    // 1. Monitored person's profile name if available (e.g. "Alice")
    // 2. Or their relationship e.g. "Mother" / "Partner" (if not 'Other')
    // 3. Fallback to "Monitored person"
    // Never show the caregiver's own name (row.caregiver.name)
    const displayName =
      row.monitoredPersonName?.trim() ||
      (row.caregiver.relationship && row.caregiver.relationship.toLowerCase() !== 'other'
        ? row.caregiver.relationship
        : 'Monitored person');

    const until = lastAt ? timeUntilDue(lastAt, row.frequencyDays ?? 1) : null;
    const nextDue = until === 'overdue' ? 'now' : until ? `in ${until}` : null;

    return {
      id: row.caregiver.id,
      name: displayName,
      relationship: row.caregiver.relationship ?? 'Monitored',
      status,
      lastCheckIn: lastAt
        ? new Date(lastAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        : null,
      nextDue,
    };
  });

  const isEmpty = watched.length === 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSheetSubmit = (token: string) => {
    setSheetError('');
    acceptInvite(token, {
      onSuccess: () => setSheetVisible(false),
      onError: (err: unknown) => {
        setSheetError(
          err instanceof Error ? err.message : 'Could not link account. Try again.',
        );
      },
    });
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

        {/* Right side: overdue badge + add button */}
        <View style={styles.headerRight}>
          {overdueCount > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{overdueCount}</Text>
            </View>
          )}

          {/* ── "+" Add invite code button ──────────────────────────────── */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a person to watch"
          >
            <Ionicons name="add" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scroll content ────────────────────────────────────────────────── */}
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
        {/* Overdue banner */}
        {overdueCount > 0 && (
          <View style={styles.urgentBanner}>
            <Ionicons name="warning-outline" size={20} color="#CC0000" />
            <Text style={styles.urgentText}>
              {overdueCount === 1
                ? '1 person has missed their check-in.'
                : `${overdueCount} people have missed their check-ins.`}
            </Text>
          </View>
        )}

        {/* Due banner */}
        {dueCount > 0 && overdueCount === 0 && (
          <View style={styles.dueBanner}>
            <Ionicons name="time-outline" size={18} color="#A87820" />
            <Text style={styles.dueText}>
              {dueCount === 1
                ? '1 person has a check-in due.'
                : `${dueCount} people have check-ins due.`}
            </Text>
          </View>
        )}

        {/* Empty state */}
        {isEmpty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No one linked yet</Text>
            <Text style={styles.emptySubtitle}>
              Ask the person you&apos;re watching over to send you an invite from their
              app. Then tap the{' '}
              <Text style={styles.emptyInlineBtn}>+</Text>
              {' '}button above to enter your code.
            </Text>
            {/* Empty state CTA mirrors the "+" header button */}
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => setSheetVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Enter invite code"
            >
              <Ionicons name="key-outline" size={18} color={colors.white} />
              <Text style={styles.emptyAddBtnText}>Enter invite code</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cards */}
        {!isEmpty && (
          <View style={styles.cardList}>
            {watched.map((person, i) => (
              <WatchedCard key={person.id} person={person} index={i} />
            ))}

            {/* Inline "add another" row at the bottom of the list */}
            <TouchableOpacity
              style={styles.addAnotherRow}
              onPress={() => setSheetVisible(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Add another person to watch"
            >
              <View style={styles.addAnotherIcon}>
                <Ionicons name="add" size={20} color={colors.brand[600]} />
              </View>
              <Text style={styles.addAnotherText}>Add another person</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.grey[300]} />
            </TouchableOpacity>
          </View>
        )}

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={16} color={colors.brand[500]} />
          <Text style={styles.infoNoteText}>
            You&apos;ll receive a push notification whenever someone checks in or misses
            a check-in. No action needed unless you see an overdue alert.
          </Text>
        </View>
      </ScrollView>

      {/* ── Add invite code bottom sheet ──────────────────────────────────── */}
      <AddInviteSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setSheetError('');
        }}
        onSubmit={handleSheetSubmit}
        isPending={acceptPending}
        submitError={sheetError}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  alertBadge: {
    minWidth: 32, height: 32, borderRadius: 16,
    backgroundColor: '#CC0000',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  alertBadgeText: {
    fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.white,
  },
  addBtn: {
    width: 44, height: 44,
    borderRadius: radii.full,
    backgroundColor: '#00838F',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#005F6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 6,
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
  urgentText: { flex: 1, fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: '#CC0000' },
  dueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: '#FFFBEB', borderRadius: radii.lg,
    borderWidth: 1, borderColor: '#FDE68A', padding: spacing[4],
  },
  dueText: { flex: 1, fontSize: fontSizes.sm, fontWeight: fontWeights.medium, color: '#92400E' },

  // Empty state
  emptyState: { alignItems: 'center', gap: spacing[4], paddingVertical: spacing[8] },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.brand[900],
  },
  emptySubtitle: {
    fontSize: fontSizes.md, color: colors.grey[500],
    textAlign: 'center', lineHeight: fontSizes.md * 1.5,
    paddingHorizontal: spacing[4],
  },
  emptyInlineBtn: { fontWeight: fontWeights.extrabold, color: '#00838F' },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: '#00838F', borderRadius: radii.full,
    paddingHorizontal: spacing[6], paddingVertical: spacing[4],
    marginTop: spacing[2],
    shadowColor: '#005F6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
  },
  emptyAddBtnText: {
    fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.white,
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
  personName: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  statusBadge: { borderRadius: radii.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: fontWeights.bold },
  relationship: { fontSize: fontSizes.sm, color: colors.grey[500] },
  lastCheckIn: { fontSize: fontSizes.xs, color: colors.grey[400] },
  nextDue: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, marginTop: 2 },

  // "Add another" row at bottom of list
  addAnotherRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    backgroundColor: colors.white, borderRadius: radii.xl, padding: spacing[5],
    borderWidth: 1.5, borderColor: colors.grey[200], borderStyle: 'dashed',
  },
  addAnotherIcon: {
    width: 54, height: 54, borderRadius: radii.lg,
    backgroundColor: '#E0F7FA',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addAnotherText: {
    flex: 1, fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: '#00838F',
  },

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

  // ── Bottom sheet ─────────────────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetKav: {
    flex: 1, justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.grey[300],
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  sheetIconWrap: {
    width: 44, height: 44, borderRadius: radii.lg,
    backgroundColor: '#E0F7FA',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sheetHeaderText: { flex: 1, gap: 3 },
  sheetTitle: {
    fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.brand[900],
  },
  sheetSubtitle: {
    fontSize: fontSizes.sm, color: colors.grey[500], lineHeight: fontSizes.sm * 1.4,
  },
  sheetCloseBtn: {
    width: 32, height: 32, borderRadius: radii.full,
    backgroundColor: colors.grey[100],
    alignItems: 'center', justifyContent: 'center',
  },
  sheetDivider: {
    height: 1, backgroundColor: colors.grey[100],
    marginHorizontal: spacing[5], marginBottom: spacing[4],
  },
  sheetBody: {
    paddingHorizontal: spacing[5],
    gap: spacing[4],
  },

  // Sheet error banner
  sheetErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: '#FEF2F2', borderRadius: radii.md,
    borderWidth: 1, borderColor: '#FCA5A5', padding: spacing[3],
  },
  sheetErrorText: {
    flex: 1, fontSize: fontSizes.xs, color: '#CC0000',
    lineHeight: fontSizes.xs * 1.4,
  },

  // Hint banner
  hintBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: '#FFFBEB', borderRadius: radii.lg,
    borderWidth: 1, borderColor: '#FDE68A', padding: spacing[3],
  },
  hintText: {
    flex: 1, fontSize: fontSizes.sm, color: '#92400E', lineHeight: fontSizes.sm * 1.4,
  },

  // Sheet info note
  sheetInfoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: colors.brand[50], borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.brand[100], padding: spacing[3],
  },
  sheetInfoText: {
    flex: 1, fontSize: fontSizes.xs, color: colors.brand[700],
    lineHeight: fontSizes.xs * 1.55,
  },
});
