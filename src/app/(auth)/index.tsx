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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !password) return;
    setLoading(true);
    // TODO: wire up Supabase auth
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    router.push('/(onboarding)/caregiver');
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
          <Text style={styles.title}>Let's get you settled</Text>
          <Text style={styles.subtitle}>Your details stay private and protected.</Text>

          {/* ── Form ──────────────────────────────────────────────────────── */}
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
              placeholder="At least 8 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              textContentType="newPassword"
            />
          </View>

          {/* ── Create account button ─────────────────────────────────────── */}
          <Button
            label="Create account"
            onPress={handleCreate}
            loading={loading}
            disabled={!email || password.length < 8}
          />

          {/* ── Divider ───────────────────────────────────────────────────── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ── Social buttons ────────────────────────────────────────────── */}
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

          {/* ── Terms ─────────────────────────────────────────────────────── */}
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
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
});
