/**
 * Role selection screen — shown immediately after sign-up.
 * The user picks whether they are:
 *   A) Someone who needs safety monitoring (the existing flow), or
 *   B) A caregiver joining via an invite code (new flow).
 *
 * No functional code here — navigation only.
 * Functional wiring (saving role intent) comes in the next phase.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '@/theme/tokens';
import { useAuth } from '@/features/auth';

// ── Role option card data ─────────────────────────────────────────────────────
const ROLES = [
  {
    key: 'member',
    icon: 'shield-checkmark' as const,
    iconOutline: 'shield-checkmark-outline' as const,
    iconBg: colors.brand[100],
    iconColor: colors.brand[700],
    title: 'I need safety monitoring',
    description: 'Set up daily check-ins and secure messages for the people you love.',
    borderColor: colors.brand[400],
  },
  {
    key: 'caregiver',
    icon: 'eye' as const,
    iconOutline: 'eye-outline' as const,
    iconBg: colors.caregiver[50],
    iconColor: colors.caregiver[700],
    title: "I'm a caregiver",
    description: "I have an invite code and I'm here to watch over someone.",
    borderColor: colors.caregiver[700],
  },
] as const;

type RoleKey = 'member' | 'caregiver';

// ── Screen ────────────────────────────────────────────────────────────────────
export default function RoleSelectScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? params.userId;
  const [selected, setSelected] = useState<RoleKey | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    if (selected === 'member') {
      // Existing monitored-person onboarding flow
      router.push({
        pathname: '/(onboarding)/caregiver',
        params: { userId },
      });
    } else {
      // New caregiver invite-code flow
      router.push({
        pathname: '/(onboarding)/caregiver-join',
        params: { userId },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Ionicons name="infinite-outline" size={28} color={colors.brand[600]} />
          </View>
          <Text style={styles.title}>Welcome to Deadme</Text>
          <Text style={styles.subtitle}>
            How will you be using the app? You can always do both later.
          </Text>
        </View>

        {/* ── Role cards ────────────────────────────────────────────────────── */}
        <View style={styles.cards}>
          {ROLES.map((role) => {
            const isSelected = selected === role.key;
            return (
              <TouchableOpacity
                key={role.key}
                style={[
                  styles.card,
                  isSelected && { borderColor: role.borderColor, borderWidth: 2 },
                ]}
                onPress={() => setSelected(role.key)}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={role.title}
              >
                {/* Selection indicator */}
                <View style={styles.cardTop}>
                  <View style={[styles.iconWrap, { backgroundColor: role.iconBg }]}>
                    <Ionicons
                      name={isSelected ? role.icon : role.iconOutline}
                      size={26}
                      color={role.iconColor}
                    />
                  </View>
                  <View style={[
                    styles.radioOuter,
                    isSelected && { borderColor: role.borderColor },
                  ]}>
                    {isSelected && (
                      <View style={[styles.radioInner, { backgroundColor: role.borderColor }]} />
                    )}
                  </View>
                </View>

                <Text style={styles.cardTitle}>{role.title}</Text>
                <Text style={styles.cardDesc}>{role.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Continue button ───────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          <Text style={[styles.continueBtnText, !selected && styles.continueBtnTextDisabled]}>
            Continue
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={selected ? colors.white : colors.grey[400]}
          />
        </TouchableOpacity>

        {/* ── Footer note ───────────────────────────────────────────────────── */}
        <Text style={styles.footerNote}>
          You can switch roles or do both at any time from Settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },

  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[6],
    justifyContent: 'center',
  },

  // Header
  header: { gap: spacing[3], alignItems: 'flex-start' },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    lineHeight: fontSizes.md * 1.5,
  },

  // Cards
  cards: { gap: spacing[4] },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing[5],
    gap: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.grey[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  cardTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
    letterSpacing: -0.2,
  },
  cardDesc: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
    lineHeight: fontSizes.sm * 1.55,
  },

  // Continue button
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.brand[700],
    borderRadius: radii.full,
    paddingVertical: spacing[5],
    shadowColor: colors.brand[800],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnDisabled: {
    backgroundColor: colors.grey[200],
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.white,
  },
  continueBtnTextDisabled: {
    color: colors.grey[400],
  },

  // Footer
  footerNote: {
    textAlign: 'center',
    fontSize: fontSizes.xs,
    color: colors.grey[400],
    lineHeight: fontSizes.xs * 1.5,
  },
});
