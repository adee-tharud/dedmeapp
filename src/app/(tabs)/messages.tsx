import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

const { width } = Dimensions.get('window');

// ─── Mock data ────────────────────────────────────────────────────────────────
const MESSAGES = [
  {
    id: '1',
    recipient: 'Maya',
    initial: 'M',
    avatarColor: colors.brand[100],
    initialColor: colors.brand[700],
    status: 'ACTIVE' as const,
    preview: '"There are a few things I want you to know…"',
    updatedAt: 'Updated 2 days ago',
  },
  {
    id: '2',
    recipient: 'Jordan',
    initial: 'J',
    avatarColor: '#FFF0E0',
    initialColor: '#C07830',
    status: 'DRAFT' as const,
    preview: '"I started writing this for you…"',
    updatedAt: 'Updated 1 week ago',
  },
];

const STATUS_STYLES: Record<
  'ACTIVE' | 'DRAFT',
  { bg: string; text: string; label: string }
> = {
  ACTIVE: { bg: '#E6F9EE', text: '#1A8A47', label: 'ACTIVE' },
  DRAFT:  { bg: colors.grey[100], text: colors.grey[500], label: 'DRAFT' },
};

export default function MessagesScreen() {
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
        {/* ── Subtitle ──────────────────────────────────────────────────────  */}
        <Text style={styles.subtitle}>
          Kept safe and shared only if your full check-in plan completes.
        </Text>

        {/* ── Message cards ─────────────────────────────────────────────────  */}
        <View style={styles.cardList}>
          {MESSAGES.map(msg => {
            const s = STATUS_STYLES[msg.status];
            return (
              <TouchableOpacity
                key={msg.id}
                style={styles.card}
                activeOpacity={0.85}
                accessibilityLabel={`Message for ${msg.recipient}, ${msg.status}`}
                accessibilityRole="button"
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: msg.avatarColor }]}>
                  <Text style={[styles.avatarText, { color: msg.initialColor }]}>
                    {msg.initial}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                  {/* Name + badge row */}
                  <View style={styles.nameRow}>
                    <Text style={styles.recipientName}>For {msg.recipient}</Text>
                    <View style={[styles.badge, { backgroundColor: s.bg }]}>
                      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
                    </View>
                  </View>

                  {/* Preview */}
                  <Text style={styles.preview} numberOfLines={1}>
                    {msg.preview}
                  </Text>

                  {/* Updated at */}
                  <Text style={styles.updatedAt}>{msg.updatedAt}</Text>
                </View>

                {/* Chevron */}
                <Ionicons name="chevron-forward" size={18} color={colors.grey[300]} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Add note CTA banner ───────────────────────────────────────────  */}
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
            activeOpacity={0.85}
            accessibilityLabel="Add a new message"
            accessibilityRole="button"
          >
            <Ionicons name="add" size={18} color={colors.brand[800]} />
            <Text style={styles.ctaBtnText}>Add</Text>
          </TouchableOpacity>
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
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.brand[700],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 6,
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },

  // Subtitle
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    lineHeight: fontSizes.md * 1.5,
  },

  // Cards
  cardList: { gap: spacing[3] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[5],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
  cardContent: { flex: 1, gap: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  recipientName: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeights.bold,
    letterSpacing: 0.5,
  },
  preview: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  updatedAt: {
    fontSize: fontSizes.xs,
    color: colors.grey[400],
    marginTop: 2,
  },

  // CTA banner
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    backgroundColor: colors.sky.circle1,
    borderRadius: radii.xl,
    padding: spacing[5],
  },
  ctaMascot: {
    width: 56,
    height: 56,
    flexShrink: 0,
  },
  ctaText: { flex: 1, gap: 4 },
  ctaTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  ctaSubtitle: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ctaBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[800],
  },
});
