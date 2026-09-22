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
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, fontSizes, fontWeights, radii, spacing } from '../../theme/tokens';

export default function SignInScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSignIn = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    // TODO: wire up Supabase auth
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    // On success navigate to main app — replace so user can't go back to sign-in
    router.replace('/(tabs)');
  };

  const handleForgotPassword = () => {
    // TODO: navigate to forgot-password screen or show a modal
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sign in</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Mascot ──────────────────────────────────────────────────────── */}
          <Image
            source={require('../../../assets/logo1.png')}
            style={styles.mascot}
            resizeMode="contain"
          />

          {/* ── Title ───────────────────────────────────────────────────────── */}
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue protecting your loved ones.</Text>

          {/* ── Form ────────────────────────────────────────────────────────── */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              textContentType="emailAddress"
            />
            <Input
              label="Password"
              placeholder="Your password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textContentType="password"
              labelRight="Forgot password?"
            />
          </View>

          {/* Forgot password tap target (positioned under the field) */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            style={styles.forgotRow}
            accessibilityLabel="Forgot password"
          >
            <Text style={styles.forgotText}>Forgot your password?</Text>
          </TouchableOpacity>

          {/* ── Error message ───────────────────────────────────────────────── */}
          {error !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* ── Sign in button ──────────────────────────────────────────────── */}
          <Button
            label="Sign in"
            onPress={handleSignIn}
            loading={loading}
            disabled={!email || password.length < 1}
          />

          {/* ── Divider ─────────────────────────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social buttons ──────────────────────────────────────────────── */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.85}
              accessibilityLabel="Continue with Apple"
            >
              <Text style={styles.socialIcon}>⏺</Text>
              <Text style={styles.socialLabel}>Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.85}
              accessibilityLabel="Continue with Google"
            >
              <Text style={[styles.socialIcon, { color: '#4285F4' }]}>G</Text>
              <Text style={styles.socialLabel}>Google</Text>
            </TouchableOpacity>
          </View>

          {/* ── No account yet? ─────────────────────────────────────────────── */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpPrompt}>Don't have an account?</Text>
            <TouchableOpacity
              onPress={() => router.replace('/(auth)/')}
              accessibilityLabel="Create account"
            >
              <Text style={styles.signUpLink}> Create one</Text>
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

  // Forgot password
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: -spacing[3],
  },
  forgotText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    color: colors.brand[600],
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

  // Sign up link
  signUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpPrompt: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  signUpLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[600],
  },
});
