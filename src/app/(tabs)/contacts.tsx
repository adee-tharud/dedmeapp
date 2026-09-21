import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

// ─── Mock data ────────────────────────────────────────────────────────────────
const CIRCLE_MEMBERS = [
  {
    id: '1',
    name: 'Maya Chen',
    initial: 'M',
    avatarColor: colors.brand[100],
    initialColor: colors.brand[700],
    relationship: 'Sister · Caregiver',
    status: 'CONNECTED' as const,
  },
];

const STATUS_CONFIG = {
  CONNECTED: { bg: '#E6F9EE', text: '#1A8A47', label: 'CONNECTED' },
  PENDING:   { bg: '#FFF7E0', text: '#A87820', label: 'PENDING' },
};

export default function ContactsScreen() {
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
          <Text style={styles.heroTitle}>You're not doing this alone</Text>
          <Text style={styles.heroSubtitle}>
            Your trusted people only hear from us when they need to.
          </Text>
        </View>

        {/* ── Circle members ────────────────────────────────────────────────  */}
        <View style={styles.memberList}>
          {CIRCLE_MEMBERS.map(member => {
            const sc = STATUS_CONFIG[member.status];
            return (
              <TouchableOpacity
                key={member.id}
                style={styles.memberCard}
                activeOpacity={0.85}
                accessibilityLabel={`${member.name}, ${member.relationship}, ${member.status}`}
                accessibilityRole="button"
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
                  <Text style={[styles.avatarText, { color: member.initialColor }]}>
                    {member.initial}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRelation}>{member.relationship}</Text>
                </View>

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

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
            They can confirm you're okay to stop delivery.
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

  // Members
  memberList: { gap: spacing[3] },
  memberCard: {
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
  memberInfo: { flex: 1, gap: 3 },
  memberName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  memberRelation: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  statusBadge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  statusText: {
    fontSize: 11,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
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
