/**
 * Secret Messages list screen.
 *
 * Security Guide §5: no Supabase calls inline — all through hook layer.
 * Security Guide §6: data fetching via useMessages hook; userId from auth context.
 *
 * Message bodies are decrypted client-side; what you see here is plaintext
 * only after the crypto layer has verified the authentication tag.
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme/tokens';
import { useAuth } from '@/features/auth/AuthContext';
import { useMessages } from '@/features/messages';
import type { DecryptedMessage } from '@/features/messages';
import { formatRelativeDate, bodyPreview, avatarInitial } from '@/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  'draft' | 'active' | 'sent',
  { bg: string; text: string; label: string }
> = {
  active: { bg: '#E6F9EE', text: '#1A8A47', label: 'ACTIVE' },
  draft:  { bg: colors.grey[100], text: colors.grey[500], label: 'DRAFT' },
  sent:   { bg: '#E8F0FE', text: '#1A56DB', label: 'SENT' },
};

function avatarColors(index: number): { bg: string; text: string } {
  const palette = [
    { bg: colors.brand[100], text: colors.brand[700] },
    { bg: '#FFF0E0', text: '#C07830' },
    { bg: '#F0E8FF', text: '#7B2FBE' },
    { bg: '#E0F7FA', text: '#00838F' },
    { bg: '#FBE9E7', text: '#BF360C' },
  ];
  return palette[index % palette.length];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // ✅ Uses useMessages hook — no raw service call in the screen
  const { data: messages, isLoading, isError, refetch } = useMessages(userId);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>Secret messages</Text>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/message/new/step-1')}
          activeOpacity={0.85}
          accessibilityLabel="Add new message"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>
          Kept safe and shared only if your full check-in plan completes.
        </Text>

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {isLoading && (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.brand[600]} size="large" />
            <Text style={styles.centerStateText}>Decrypting your messages…</Text>
          </View>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {isError && (
          <TouchableOpacity style={styles.errorBanner} onPress={() => refetch()}>
            <Ionicons name="alert-circle-outline" size={18} color="#CC0000" />
            <Text style={styles.errorText}>Could not load messages. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* ── Empty state ───────────────────────────────────────────────────── */}
        {!isLoading && !isError && messages?.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✉</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>
              Write something to the people who matter — they&apos;ll only receive it if they need to.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/message/new/step-1')}
            >
              <Text style={styles.emptyBtnText}>Write your first message</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Message cards ─────────────────────────────────────────────────── */}
        {!isLoading && !isError && (messages?.length ?? 0) > 0 && (
          <View style={styles.cardList}>
            {(messages as DecryptedMessage[]).map((msg, i) => {
              const s = STATUS_STYLES[msg.status];
              const av = avatarColors(i);
              return (
                <TouchableOpacity
                  key={msg.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  accessibilityLabel={`Message for ${msg.recipient_name}, ${msg.status}`}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/message/[id]', params: { id: msg.id } })}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                    <Text style={[styles.avatarText, { color: av.text }]}>
                      {avatarInitial(msg.recipient_name)}
                    </Text>
                  </View>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    <View style={styles.nameRow}>
                      <Text style={styles.recipientName}>For {msg.recipient_name}</Text>
                      <View style={[styles.badge, { backgroundColor: s.bg }]}>
                        <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.preview} numberOfLines={1}>
                      {bodyPreview(msg.body)}
                    </Text>
                    <Text style={styles.updatedAt}>{formatRelativeDate(msg.updated_at)}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.grey[300]} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ── Add another CTA ───────────────────────────────────────────────── */}
        {(messages?.length ?? 0) > 0 && (
          <View style={styles.ctaBanner}>
            <Image
              source={require('../../../assets/logo1.png')}
              style={styles.ctaMascot}
              resizeMode="contain"
            />
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Want to leave another note?</Text>
              <Text style={styles.ctaSubtitle}>Say what matters, in your own time.</Text>
            </View>
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={() => router.push('/message/new/step-1')}
              activeOpacity={0.85}
              accessibilityLabel="Add a new message"
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color={colors.brand[800]} />
              <Text style={styles.ctaBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Encryption notice ─────────────────────────────────────────────── */}
        <View style={styles.encryptionNotice}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.grey[400]} />
          <Text style={styles.encryptionText}>
            Messages are encrypted on your device before being stored. Even we can&apos;t read them.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.5,
  },
  fab: {
    width: 48, height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.brand[700],
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.brand[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28, shadowRadius: 10, elevation: 6,
  },

  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },

  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    lineHeight: fontSizes.md * 1.5,
  },

  // Loading / Error
  centerState: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[8] },
  centerStateText: { fontSize: fontSizes.sm, color: colors.grey[400] },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    backgroundColor: '#FFF0F0', borderRadius: radii.lg,
    padding: spacing[4], borderWidth: 1, borderColor: '#FFCCCC',
  },
  errorText: { flex: 1, color: '#CC0000', fontSize: fontSizes.sm },

  // Empty state
  emptyState: {
    alignItems: 'center', gap: spacing[4],
    paddingVertical: spacing[10],
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: fontSizes.xl, fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  emptySubtitle: {
    fontSize: fontSizes.md, color: colors.grey[500],
    textAlign: 'center', lineHeight: fontSizes.md * 1.5,
    paddingHorizontal: spacing[4],
  },
  emptyBtn: {
    backgroundColor: colors.brand[700],
    borderRadius: radii.full,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    marginTop: spacing[2],
  },
  emptyBtnText: {
    color: colors.white, fontWeight: fontWeights.bold, fontSize: fontSizes.md,
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
    width: 52, height: 52, borderRadius: radii.lg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: fontSizes.xl, fontWeight: fontWeights.bold },
  cardContent: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  recipientName: { fontSize: fontSizes.lg, fontWeight: fontWeights.bold, color: colors.brand[900] },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing[2], paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: fontWeights.bold, letterSpacing: 0.5 },
  preview: { fontSize: fontSizes.sm, color: colors.grey[500] },
  updatedAt: { fontSize: fontSizes.xs, color: colors.grey[400], marginTop: 2 },

  // CTA banner
  ctaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[4],
    backgroundColor: colors.sky.circle1, borderRadius: radii.xl, padding: spacing[5],
  },
  ctaMascot: { width: 56, height: 56, flexShrink: 0 },
  ctaText: { flex: 1, gap: 4 },
  ctaTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[900] },
  ctaSubtitle: { fontSize: fontSizes.sm, color: colors.grey[500] },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[1],
    backgroundColor: colors.white, borderRadius: radii.xl,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  ctaBtnText: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.brand[800] },

  // Encryption notice
  encryptionNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    paddingHorizontal: spacing[2],
  },
  encryptionText: {
    flex: 1, fontSize: fontSizes.xs, color: colors.grey[400],
    lineHeight: fontSizes.xs * 1.5,
  },
});
