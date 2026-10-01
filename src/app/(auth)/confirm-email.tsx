import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { colors, fontSizes, fontWeights, spacing } from '../../theme/tokens';
import { useAuth } from '../../features/auth/AuthContext';

/**
 * Shown after completing onboarding when Supabase email confirmation is
 * still pending. Once the user clicks the link in their inbox, the
 * onAuthStateChange listener in the root layout fires and updates the
 * session — we watch that here and auto-navigate to tabs on confirmation.
 */
export default function ConfirmEmailScreen() {
  const { session } = useAuth();

  // Auto-redirect once the email is confirmed and a session arrives
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.title}>One last step</Text>
        <Text style={styles.body}>
          We&apos;ve sent a confirmation link to your email address.
          Click it to activate your account — you&apos;ll be taken straight
          into the app automatically.
        </Text>
        <View style={styles.hint}>
          <Text style={styles.hintText}>Already confirmed?</Text>
        </View>
        {/* Fallback in case the deep link doesn't re-open the app */}
        <Button
          label="Sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.sky.bg,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[5],
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    textAlign: 'center',
    lineHeight: fontSizes.md * 1.6,
  },
  hint: {
    marginBottom: -spacing[2],
  },
  hintText: {
    fontSize: fontSizes.sm,
    color: colors.grey[400],
    textAlign: 'center',
  },
});
