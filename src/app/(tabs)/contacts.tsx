import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '@/theme/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { useCaregivers, useResendCaregiverInvite } from '@/features/contacts';
import { avatarInitial } from '@/utils';

// ── Link status config ───────────────────────────────────────────────────────
// We now have THREE distinct states for a caregiver row:
//   1. accepted + caregiver_user_id set  → they have the app and are linked
//   2. accepted + caregiver_user_id null → accepted via email, no app yet (legacy)
//   3. pending                           → invite sent, waiting for them to act

function getLinkStatus(caregiver: { status: string; caregiver_user_id: string | null }) {
  if (caregiver.status === 'accepted' && caregiver.caregiver_user_id) {
    return { bg: colors.surface.caregiver, text: colors.surface.caregiverText, label: 'APP LINKED', icon: 'phone-portrait-outline' as const };
  }
  if (caregiver.status === 'accepted') {
    return { bg: colors.surface.success, text: colors.surface.successDark, label: 'CONNECTED', icon: 'checkmark-circle-outline' as const };
  }
  return { bg: colors.surface.warningSubtle, text: colors.surface.warningDark, label: 'EMAIL ONLY · PENDING', icon: 'mail-outline' as const };
}

// ── Caregiver avatar palette ──────────────────────────────────────────────────

function avatarColors(index: number): { bg: string; text: string } {
  const palette = [
    colors.avatar.blue,
    colors.avatar.orange,
    colors.avatar.purple,
    colors.avatar.teal,
  ];
  return palette[index % palette.length];
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ContactsScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // ✅ Real data from Supabase via hook layer
  const { data: caregivers, isLoading, isError, refetch } = useCaregivers(userId);
  const resendMutation = useResendCaregiverInvite(userId);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Your circle</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero section ──────────────────────────────────────────────────  */}
        <View style={styles.hero}>
          <Image
            source={require('../../../assets/logo1.png')}
            style={styles.mascot}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>You&apos;re not doing this alone</Text>
          <Text style={styles.heroSubtitle}>
            Your trusted people only hear from us when they need to.
          </Text>
        </View>

        {/* ── Loading ───────────────────────────────────────────────────────  */}
        {isLoading && (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.brand[600]} size="large" />
            <Text style={styles.centerStateText}>Loading your circle…</Text>
          </View>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────  */}
        {isError && (
          <TouchableOpacity style={styles.errorBanner} onPress={() => refetch()}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.surface.dangerText} />
            <Text style={styles.errorText}>Could not load contacts. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* ── Circle members ────────────────────────────────────────────────  */}
        {!isLoading && !isError && (caregivers?.length ?? 0) > 0 && (
          <View style={styles.memberList}>
            {caregivers!.map((caregiver, i) => {
              const ls = getLinkStatus(caregiver);
              const av = avatarColors(i);
              const isPending = caregiver.status === 'pending';
              const acceptedDate = caregiver.accepted_at
                ? new Date(caregiver.accepted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : null;

              return (
                <View key={caregiver.id} style={styles.memberCard}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.text }]}>
                      {avatarInitial(caregiver.name)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{caregiver.name}</Text>
                    <Text style={styles.memberRelation}>
                      {caregiver.relationship ?? 'Caregiver'}
                    </Text>
                    {/* Show linkage date if they have accepted */}
                    {acceptedDate && (
                      <Text style={styles.linkedDate}>Linked {acceptedDate}</Text>
                    )}
                    {/* Resend invite for still-pending caregivers */}
                    {isPending && (
                      <TouchableOpacity
                        style={[
                          styles.resendBtn,
                          resendMutation.isPending && resendMutation.variables === caregiver.id && { opacity: 0.6 },
                        ]}
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`Resend invite to ${caregiver.name}`}
                        disabled={resendMutation.isPending && resendMutation.variables === caregiver.id}
                        onPress={() => {
                          resendMutation.mutate(caregiver.id, {
                            onSuccess: () => {
                              Alert.alert(
                                'Invite Sent',
                                `A fresh invitation code has been sent to ${caregiver.email}. It will remain valid for 72 hours.`,
                              );
                            },
                            onError: (err) => {
                              Alert.alert('Could Not Resend Invite', err.message);
                            },
                          });
                        }}
                      >
                        {resendMutation.isPending && resendMutation.variables === caregiver.id ? (
                          <ActivityIndicator size="small" color={colors.brand[600]} />
                        ) : (
                          <>
                            <Ionicons name="send-outline" size={12} color={colors.brand[600]} />
                            <Text style={styles.resendBtnText}>Resend invite</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Link status badge */}
                  <View style={[styles.statusBadge, { backgroundColor: ls.bg }]}>
                    <Ionicons name={ls.icon} size={11} color={ls.text} />
                    <Text style={[styles.statusText, { color: ls.text }]}>{ls.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────  */}
        {!isLoading && !isError && (caregivers?.length ?? 0) === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No caregivers yet</Text>
            <Text style={styles.emptySubtitle}>
              Add a trusted person to your circle. They&apos;ll only be contacted if you stop checking in.
            </Text>
          </View>
        )}

        {/* ── Invite someone ────────────────────────────────────────────────  */}
        <TouchableOpacity
          style={styles.inviteBtn}
          activeOpacity={0.85}
          accessibilityLabel="Invite someone to your circle"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colors.brand[800]} />
          <Text style={styles.inviteBtnText}>Invite someone</Text>
        </TouchableOpacity>

        {/* ── Info note ─────────────────────────────────────────────────────  */}
        <View style={styles.infoNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.brand[500]} />
          <Text style={styles.infoNoteText}>
            Contacts only receive an alert when escalation reaches the final stage.
            They can confirm you&apos;re okay to stop delivery.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },

  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.5,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[6],
  },

  // Hero
  hero: {
    alignItems: 'flex-start',
    gap: spacing[4],
    paddingTop: spacing[4],
  },
  mascot: {
    width: 90,
    height: 90,
  },
  heroTitle: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.7,
    lineHeight: fontSizes['3xl'] * 1.15,
  },
  heroSubtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    lineHeight: fontSizes.md * 1.5,
  },

  // Loading / Error
  centerState: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[6] },
  centerStateText: { fontSize: fontSizes.sm, color: colors.grey[400] },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: colors.surface.dangerSubtle, borderRadius: radii.lg,
    padding: spacing[4], borderWidth: 1, borderColor: colors.surface.dangerBorderSubtle,
  },
  errorText: { flex: 1, color: colors.surface.dangerText, fontSize: fontSizes.sm },

  // Empty state
  emptyState: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[6] },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold, color: colors.brand[900] },
  emptySubtitle: {
    fontSize: fontSizes.md, color: colors.grey[500],
    textAlign: 'center', lineHeight: fontSizes.md * 1.5,
  },

  // Members
  memberList: { gap: spacing[3] },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[5],
    ...shadows.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  memberInfo: { flex: 1, gap: 4 },
  memberName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  memberRelation: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  linkedDate: {
    fontSize: fontSizes.xs,
    color: colors.grey[400],
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
    backgroundColor: colors.brand[50],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.brand[200],
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  resendBtnText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.brand[700],
  },
  statusBadge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.4,
  },

  // Invite button
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    paddingVertical: spacing[5],
    ...shadows.subtle,
  },
  inviteBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[800],
  },

  // Info note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: colors.brand[50],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brand[100],
    padding: spacing[4],
  },
  infoNoteText: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.brand[700],
    lineHeight: fontSizes.sm * 1.55,
  },
});
