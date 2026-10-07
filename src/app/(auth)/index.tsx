/**
 * Sign-up screen — step 1 of account creation.
 *
 * Security Guide §4: surface real Supabase errors (weak password, email
 * already registered) instead of always navigating forward on submit.
 * Security Guide §7: validate email properly with Zod, not .length > 0.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';
import { signUpSchema, signUp } from '@/features/auth';

export default function SignUpScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /** Derive the disabled state from Zod so the button rule matches the submit rule. */
  const parseResult = signUpSchema.safeParse({ email, password });
  const isFormValid = parseResult.success;

  const handleCreate = async () => {
    setError('');

    // Client-side Zod validation (UX convenience — server also validates)
    const result = signUpSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    try {
      const data = await signUp(result.data);

      // Always proceed to onboarding immediately — the caregiver and plan
      // steps don't require an active session to collect data.
      // If email confirmation is required, Supabase returns a user but no
      // session; the user will be fully authenticated once they click the
      // link in their inbox. We proceed rather than blocking onboarding.
      if (data.user) {
        // Pass userId as a param so caregiver screen can save the row
        // even before the email is confirmed (session will be null until then).
        router.push({ pathname: '/(onboarding)/caregiver', params: { userId: data.user.id } });
      } else {
        // Unexpected: no user and no error — surface clearly.
        setError('Account could not be created. Please try again.');
      }
    } catch (err: unknown) {
      // Surface the real Supabase error message (§4: never fake success on failure)
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create your account</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Step indicator ──────────────────────────────────────────────── */}
        <View style={styles.stepRow}>
          <StepIndicator total={3} current={0} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Mascot ────────────────────────────────────────────────────── */}
          <Image
            source={require('../../../assets/logo1.png')}
            style={styles.mascot}
            resizeMode="contain"
          />

          {/* ── Title ─────────────────────────────────────────────────────── */}
          <Text style={styles.title}>Let&apos;s get you settled</Text>
          <Text style={styles.subtitle}>Your details stay private and protected.</Text>

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              textContentType="emailAddress"
            />
            <Input
              label="Password"
              placeholder="At least 8 characters"
              secureTextEntry
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
              textContentType="newPassword"
            />
          </View>

          {/* ── Error banner ──────────────────────────────────────────────── */}
          {error !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* ── Create account button ─────────────────────────────────────── */}
          <Button
            label="Create account"
            onPress={handleCreate}
            loading={isLoading}
            disabled={!isFormValid || isLoading}
          />

          {/* ── Divider ───────────────────────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social buttons — disabled until wired (Guide §4) ──────────── */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialBtn, styles.socialBtnDisabled]}
              activeOpacity={0.6}
              accessibilityLabel="Continue with Apple — coming soon"
              disabled
            >
              <Text style={styles.socialIcon}>⏺</Text>
              <Text style={[styles.socialLabel, styles.socialLabelDisabled]}>Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, styles.socialBtnDisabled]}
              activeOpacity={0.6}
              accessibilityLabel="Continue with Google — coming soon"
              disabled
            >
              <Text style={[styles.socialIcon, { color: '#4285F4', opacity: 0.5 }]}>G</Text>
              <Text style={[styles.socialLabel, styles.socialLabelDisabled]}>Google</Text>
            </TouchableOpacity>
          </View>

          {/* ── Terms ─────────────────────────────────────────────────────── */}
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>

          {/* ── Already have an account ───────────────────────────────────── */}
          <View style={styles.signInRow}>
            <Text style={styles.signInPrompt}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/sign-in')}
              accessibilityLabel="Sign in"
            >
              <Text style={styles.signInLink}> Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.sky.bg,
  },
  kav: {
    flex: 1,
  },

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
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  backArrow: {
    fontSize: fontSizes.lg,
    color: colors.brand[900],
    marginTop: -1,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },

  // Step
  stepRow: {
    alignItems: 'center',
    paddingBottom: spacing[4],
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },

  // Mascot
  mascot: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },

  // Text
  title: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    marginTop: -spacing[3],
  },

  // Form
  form: {
    gap: spacing[4],
  },

  // Error banner
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  errorBannerText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    fontWeight: fontWeights.medium,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.grey[200],
  },
  dividerText: {
    fontSize: fontSizes.sm,
    color: colors.grey[400],
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.grey[200],
    paddingVertical: spacing[4],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  socialBtnDisabled: {
    opacity: 0.5,
  },
  socialIcon: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  socialLabel: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
  },
  socialLabelDisabled: {
    color: colors.grey[400],
  },

  // Terms
  terms: {
    fontSize: fontSizes.xs,
    color: colors.grey[400],
    textAlign: 'center',
    lineHeight: fontSizes.xs * 1.6,
  },
  termsLink: {
    color: colors.brand[600],
    fontWeight: fontWeights.medium,
  },

  // Sign in link
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPrompt: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  signInLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[600],
  },
});
