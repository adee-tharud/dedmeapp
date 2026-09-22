import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

// ─── Types ───────────────────────────────────────────────────────────────────
type RowItem =
  | { type: 'link'; icon: string; iconColor: string; iconBg: string; label: string; sublabel?: string; onPress: () => void }
  | { type: 'toggle'; icon: string; iconColor: string; iconBg: string; label: string; sublabel?: string; value: boolean; onToggle: (v: boolean) => void };

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionGroup({ title, rows }: { title?: string; rows: RowItem[] }) {
  return (
    <View style={styles.group}>
      {title && <Text style={styles.groupTitle}>{title}</Text>}
      <View style={styles.groupCard}>
        {rows.map((row, i) => (
          <View key={row.label}>
            {row.type === 'link' ? (
              <TouchableOpacity
                style={styles.row}
                onPress={row.onPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={row.label}
              >
                <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
                  <Ionicons name={row.icon as any} size={18} color={row.iconColor} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.sublabel && <Text style={styles.rowSublabel}>{row.sublabel}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.grey[300]} />
              </TouchableOpacity>
            ) : (
              <View style={styles.row} accessibilityLabel={row.label}>
                <View style={[styles.rowIcon, { backgroundColor: row.iconBg }]}>
                  <Ionicons name={row.icon as any} size={18} color={row.iconColor} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.sublabel && <Text style={styles.rowSublabel}>{row.sublabel}</Text>}
                </View>
                <Switch
                  value={row.value}
                  onValueChange={row.onToggle}
                  trackColor={{ false: colors.grey[200], true: colors.brand[500] }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.grey[200]}
                />
              </View>
            )}
            {i < rows.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            // TODO: clear Supabase session
            router.replace('/(auth)/');
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account, messages, and contacts. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ──────────────────────────────────────────────────  */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Alex Johnson</Text>
            <Text style={styles.profileEmail}>alex@example.com</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeText}>Yearly</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.grey[300]} />
        </TouchableOpacity>

        {/* ── Check-in ──────────────────────────────────────────────────────  */}
        <SectionGroup
          title="Check-in"
          rows={[
            {
              type: 'link',
              icon: 'time-outline',
              iconColor: colors.brand[600],
              iconBg: colors.brand[100],
              label: 'Check-in frequency',
              sublabel: 'Every 24 hours',
              onPress: () => {},
            },
            {
              type: 'link',
              icon: 'calendar-outline',
              iconColor: colors.brand[600],
              iconBg: colors.brand[100],
              label: 'Escalation timing',
              sublabel: 'After full check-in plan',
              onPress: () => {},
            },
          ]}
        />

        {/* ── Notifications ─────────────────────────────────────────────────  */}
        <SectionGroup
          title="Notifications"
          rows={[
            {
              type: 'toggle',
              icon: 'notifications-outline',
              iconColor: '#9B6DFF',
              iconBg: '#F0EBFF',
              label: 'Push notifications',
              sublabel: 'Check-in reminders & alerts',
              value: pushEnabled,
              onToggle: setPushEnabled,
            },
            {
              type: 'toggle',
              icon: 'mail-outline',
              iconColor: '#3B82F6',
              iconBg: '#EFF6FF',
              label: 'Email notifications',
              sublabel: 'Backup when push is unavailable',
              value: emailEnabled,
              onToggle: setEmailEnabled,
            },
          ]}
        />

        {/* ── Privacy ───────────────────────────────────────────────────────  */}
        <SectionGroup
          title="Privacy & Security"
          rows={[
            {
              type: 'toggle',
              icon: 'finger-print-outline',
              iconColor: '#22C55E',
              iconBg: '#F0FDF4',
              label: 'Face ID / Biometrics',
              sublabel: 'Lock app on background',
              value: biometricEnabled,
              onToggle: setBiometricEnabled,
            },
            {
              type: 'link',
              icon: 'lock-closed-outline',
              iconColor: '#F59E0B',
              iconBg: '#FFFBEB',
              label: 'Privacy and security',
              onPress: () => {},
            },
          ]}
        />

        {/* ── Account ───────────────────────────────────────────────────────  */}
        <SectionGroup
          title="Account"
          rows={[
            {
              type: 'link',
              icon: 'card-outline',
              iconColor: colors.brand[600],
              iconBg: colors.brand[100],
              label: 'Subscription & billing',
              sublabel: 'Yearly · Renews Jan 2026',
              onPress: () => {},
            },
            {
              type: 'link',
              icon: 'document-text-outline',
              iconColor: colors.grey[500],
              iconBg: colors.grey[100],
              label: 'Terms of service',
              onPress: () => {},
            },
            {
              type: 'link',
              icon: 'shield-outline',
              iconColor: colors.grey[500],
              iconBg: colors.grey[100],
              label: 'Privacy policy',
              onPress: () => {},
            },
            {
              type: 'link',
              icon: 'help-circle-outline',
              iconColor: colors.grey[500],
              iconBg: colors.grey[100],
              label: 'Help & support',
              onPress: () => {},
            },
          ]}
        />

        {/* ── Danger zone ───────────────────────────────────────────────────  */}
        <View style={styles.group}>
          <View style={styles.groupCard}>
            {/* Log out */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleLogout}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Log out"
            >
              <View style={[styles.rowIcon, { backgroundColor: '#FFF0F0' }]}>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.danger }]}>Log out</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Delete account */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleDeleteAccount}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Delete account"
            >
              <View style={[styles.rowIcon, { backgroundColor: '#FFF0F0' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </View>
              <View style={styles.rowContent}>
                <Text style={[styles.rowLabel, { color: colors.danger }]}>Delete account</Text>
                <Text style={styles.rowSublabel}>Permanently remove all data</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Version ───────────────────────────────────────────────────────  */}
        <Text style={styles.version}>Deadme · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },

  header: {
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  headerTitle: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.5,
  },

  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },

  // Profile card
  profileCard: {
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
    borderRadius: radii.full,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  profileInfo: { flex: 1, gap: 2 },
  profileName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  profileEmail: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  profileBadge: {
    backgroundColor: colors.brand[100],
    borderRadius: radii.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: fontWeights.bold,
    color: colors.brand[700],
  },

  // Section group
  group: { gap: spacing[2] },
  groupTitle: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.grey[400],
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[2],
  },
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    minHeight: 60,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1, gap: 2 },
  rowLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.brand[900],
  },
  rowSublabel: {
    fontSize: fontSizes.xs,
    color: colors.grey[400],
  },
  divider: {
    height: 1,
    backgroundColor: colors.grey[100],
    marginLeft: spacing[5] + 36 + spacing[4],
  },

  // Version
  version: {
    textAlign: 'center',
    fontSize: fontSizes.xs,
    color: colors.grey[300],
  },
});
