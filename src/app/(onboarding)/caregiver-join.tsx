/**
 * Caregiver Join screen — step 2 of the caregiver onboarding path.
 * The caregiver enters the invite code (UUID) sent to their email.
 *
 * UI only — no service calls yet. The "Link My Account" button simply
 * navigates forward (functional wiring comes in the next phase).
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, fontSizes, fontWeights, radii, spacing } from '@/theme/tokens';

// ── Screen ────────────────────────────────────────────────────────────────────
export default function CaregiverJoinScreen() {
  // userId will be wired up in phase 2 when we call acceptCaregiverInvite
  const [token, setToken] = useState('');
  const [pasting, setPasting] = useState(false);

  const trimmedToken = token.trim();
  const canSubmit = trimmedToken.length === 36; // UUID length

  // ── Paste helper ──────────────────────────────────────────────────────────
  const handlePaste = async () => {
    setPasting(true);
    try {
      const text = await Clipboard.getStringAsync();
      if (text) setToken(text.trim());
    } catch {
      // Clipboard unavailable — do nothing
    } finally {
      setPasting(false);
    }
  };

  // ── Submit (UI only — functional wiring in next phase) ────────────────────
  const handleLink = () => {
    if (!canSubmit) return;
    // TODO: call acceptCaregiverInvite(trimmedToken, userId) in phase 2
    // For now, navigate to the caregiver dashboard as a UI placeholder
    router.replace('/(tabs)/caregiver-home');
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
            <Ionicons name="mail-open-outline" size={32} color="#00838F" />
          </View>

          {/* ── Title ─────────────────────────────────────────────────────────── */}
          <Text style={styles.title}>Enter your invite code</Text>
          <Text style={styles.subtitle}>
            The person who invited you sent a unique code to your email address.
            Paste or type it below to link your account.
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

            {/* Paste from clipboard shortcut */}
            <TouchableOpacity
              style={styles.pasteBtn}
              onPress={handlePaste}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Paste invite code from clipboard"
            >
              <Ionicons name="clipboard-outline" size={16} color={colors.brand[600]} />
              <Text style={styles.pasteBtnText}>
                {pasting ? 'Pasting…' : 'Paste from clipboard'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Validation hint ───────────────────────────────────────────────── */}
          {trimmedToken.length > 0 && trimmedToken.length !== 36 && (
            <View style={styles.hintBanner}>
              <Ionicons name="information-circle-outline" size={16} color="#A87820" />
              <Text style={styles.hintText}>
                The code should be 36 characters. Check your email and try again.
              </Text>
            </View>
          )}

          {/* ── Link button ───────────────────────────────────────────────────── */}
          <Button
            label="Link My Account"
            onPress={handleLink}
            disabled={!canSubmit}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
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
    backgroundColor: '#E0F7FA',
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
  pasteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    alignSelf: 'flex-start',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.brand[50],
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  pasteBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.brand[700],
  },

  // Hint
  hintBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
    backgroundColor: '#FFFBEB',
    borderRadius: radii.lg, borderWidth: 1, borderColor: '#FDE68A',
    padding: spacing[4],
  },
  hintText: {
    flex: 1, fontSize: fontSizes.sm, color: '#92400E',
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
