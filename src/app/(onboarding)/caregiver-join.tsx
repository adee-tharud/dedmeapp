/**
 * Caregiver Join screen — step 2 of the caregiver onboarding path.
 *
 * The caregiver enters the invite code (UUID) sent to their email.
 * On submit, calls acceptCaregiverInvite to link their account to the row.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '@/theme/tokens';
import { useAcceptCaregiverInvite } from '@/features/contacts';
import { useAuth } from '@/features/auth/AuthContext';

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CaregiverJoinScreen() {
  const params = useLocalSearchParams<{ userId?: string }>();
  const { user } = useAuth();
  // Session is active after OTP verification; fall back to route param if needed.
  const userId = user?.id ?? params.userId ?? '';

  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const trimmedToken = token.trim();
  const canSubmit = trimmedToken.length === 36; // UUID length

  const { mutate: acceptInvite, isPending } = useAcceptCaregiverInvite(userId);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleLink = () => {
    if (!canSubmit || !userId) return;
    setError('');
    acceptInvite(trimmedToken, {
      onSuccess: () => {
        // Replace so pressing back doesn't return to this screen
        router.replace('/(tabs)/caregiver-home');
      },
      onError: (err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not link account. Please check your code and try again.',
        );
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.brand[900]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Join as Caregiver</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Icon ──────────────────────────────────────────────────────────── */}
          <View style={styles.iconWrap}>
            <Ionicons name="mail-open-outline" size={32} color={colors.caregiver[700]} />
          </View>

          {/* ── Title ─────────────────────────────────────────────────────────── */}
          <Text style={styles.title}>Enter your invite code</Text>
          <Text style={styles.subtitle}>
            The person who invited you sent a unique code to your email address.
            Long-press the field to paste it, or type it below.
          </Text>

          {/* ── Input ─────────────────────────────────────────────────────────── */}
          <View style={styles.inputGroup}>
            <Input
              label="Invite code"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.pasteHint}>
              <Ionicons name="information-circle-outline" size={13} color={colors.grey[400]} />
              <Text style={styles.pasteHintText}>
                Long-press the field above to paste your code from clipboard.
              </Text>
            </View>
          </View>

          {/* ── Validation hint ───────────────────────────────────────────────── */}
          {trimmedToken.length > 0 && !canSubmit && (
            <View style={styles.hintBanner}>
              <Ionicons name="information-circle-outline" size={16} color={colors.surface.warningDark} />
              <Text style={styles.hintText}>
                The code should be 36 characters. Check your email and try again.
              </Text>
            </View>
          )}

          {/* ── Error banner ──────────────────────────────────────────────────── */}
          {error !== '' && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.surface.dangerText} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Link button ───────────────────────────────────────────────────── */}
          <Button
            label={isPending ? 'Linking…' : 'Link My Account'}
            onPress={handleLink}
            disabled={!canSubmit || isPending || !userId}
            loading={isPending}
          />

          {/* ── Separator ─────────────────────────────────────────────────────── */}
          <View style={styles.separatorRow}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorLabel}>or</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* ── No code link ──────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.noCodeBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="I don't have a code"
          >
            <Text style={styles.noCodeText}>I don&apos;t have a code</Text>
          </TouchableOpacity>

          {/* ── Info banner ───────────────────────────────────────────────────── */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-outline" size={16} color={colors.brand[600]} />
            <Text style={styles.infoText}>
              Your invite code is private and single-use. Once linked, the person
              you are watching over will be notified automatically.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.sky.bg },
  kav: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.subtle,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[5],
    paddingTop: spacing[4],
  },

  // Icon
  iconWrap: {
    width: 68, height: 68,
    borderRadius: radii.full,
    backgroundColor: colors.caregiver[50],
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  // Text
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.6,
    marginTop: -spacing[2],
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    lineHeight: fontSizes.md * 1.5,
    marginTop: -spacing[3],
  },

  // Input group
  inputGroup: { gap: spacing[2] },
  pasteHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
  },
  pasteHintText: {
    flex: 1, fontSize: fontSizes.xs, color: colors.grey[400],
    lineHeight: fontSizes.xs * 1.5,
  },

  // Validation hint
  hintBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: colors.surface.warning,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surface.warningBorder,
    padding: spacing[4],
  },
  hintText: {
    flex: 1, fontSize: fontSizes.sm, color: colors.surface.warningText,
    lineHeight: fontSizes.sm * 1.5,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: colors.surface.danger,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.surface.dangerBorder,
    padding: spacing[4],
  },
  errorText: {
    flex: 1, fontSize: fontSizes.sm, color: colors.surface.dangerText,
    lineHeight: fontSizes.sm * 1.5,
  },

  // Separator
  separatorRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.grey[200] },
  separatorLabel: { fontSize: fontSizes.sm, color: colors.grey[400] },

  // No code
  noCodeBtn: { alignItems: 'center', paddingVertical: spacing[2] },
  noCodeText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.brand[600],
    textDecorationLine: 'underline',
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3],
    backgroundColor: colors.brand[50], borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.brand[100], padding: spacing[4],
  },
  infoText: {
    flex: 1, fontSize: fontSizes.sm, color: colors.brand[700],
    lineHeight: fontSizes.sm * 1.55,
  },
});
