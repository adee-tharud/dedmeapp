/**
 * OTP Verification screen — shown after sign-up so the user can enter the
 * 6-digit code Supabase emailed them.
 *
 * Design decisions:
 * - 6 individual TextInput boxes (ref-managed) with auto-advance focus.
 * - Paste detection: pasting anywhere distributes the 6 digits and auto-submits.
 * - 60-second client-side cooldown before "Resend" is active.
 * - Shake animation on wrong code / expired code (using Animated).
 * - Auto-submits as soon as the 6th digit is entered.
 *
 * Security Guide §4: real Supabase errors are surfaced; we never navigate
 * forward on a failed verify.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  ScrollView,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepIndicator } from '../../components/ui/StepIndicator';
import { colors, fontSizes, fontWeights, radii, spacing, shadows } from '../../theme/tokens';
import { verifyOtp, resendOtp } from '@/features/auth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyOtpScreen() {
  const { email, userId, context } = useLocalSearchParams<{
    email?: string;
    userId?: string;
    context?: 'signup' | 'email' | 'magiclink' | 'recovery';
  }>();

  // ── OTP digit state ────────────────────────────────────────────────────────
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);

  // ── Animation ──────────────────────────────────────────────────────────────
  const [shakeAnim] = useState(() => new Animated.Value(0));

  // Auto-focus first input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // ── Resend cooldown timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // ── Trigger shake animation ────────────────────────────────────────────────
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // ── Verification handler ───────────────────────────────────────────────────
  const handleVerify = useCallback(
    async (codeToVerify?: string) => {
      const code = codeToVerify ?? digits.join('');
      if (code.length !== OTP_LENGTH) {
        setError('Please enter all 6 digits of the code.');
        return;
      }
      if (!email) {
        setError('Email address is missing. Please go back and sign up again.');
        return;
      }

      setIsVerifying(true);
      setError('');
      setInfoMessage('');

      try {
        const data = await verifyOtp({
          email,
          token: code,
          type: context || 'signup',
        });

        // Verification successful! Supabase session is now established.
        // Navigate forward into onboarding.
        router.replace({
          pathname: '/(onboarding)/role-select',
          params: { userId: data.user?.id ?? userId },
        });
      } catch (err: unknown) {
        triggerShake();
        setDigits(Array(OTP_LENGTH).fill(''));
        inputRefs.current[0]?.focus();

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Invalid or expired code. Please try again.');
        }
      } finally {
        setIsVerifying(false);
      }
    },
    [digits, email, context, userId, triggerShake],
  );

  // ── Text input changes (including paste) ────────────────────────────────────
  const handleChangeText = (text: string, index: number) => {
    setError('');
    setInfoMessage('');

    const numeric = text.replace(/[^0-9]/g, '');

    // Handle paste of multiple digits
    if (numeric.length > 1) {
      const pasted = numeric.slice(0, OTP_LENGTH).split('');
      const newDigits = Array(OTP_LENGTH).fill('');
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);

      if (pasted.length === OTP_LENGTH) {
        inputRefs.current[OTP_LENGTH - 1]?.blur();
        handleVerify(newDigits.join(''));
      } else {
        const nextIndex = Math.min(pasted.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    // Single digit entry or removal
    const newDigits = [...digits];
    newDigits[index] = numeric;
    setDigits(newDigits);

    if (numeric) {
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      } else {
        const fullCode = newDigits.join('');
        if (fullCode.length === OTP_LENGTH) {
          inputRefs.current[index]?.blur();
          handleVerify(fullCode);
        }
      }
    }
  };

  // ── Key press (for backspace navigation) ───────────────────────────────────
  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number,
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (secondsLeft > 0 || isResending) return;
    if (!email) {
      setError('Cannot resend without an email address. Please go back.');
      return;
    }

    setIsResending(true);
    setError('');
    setInfoMessage('');

    try {
      await resendOtp(email);
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      setInfoMessage('A new code has been sent to your inbox.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Could not resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const formattedCooldown = `00:${secondsLeft < 10 ? '0' : ''}${secondsLeft}`;

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
          <Text style={styles.headerTitle}>Verify code</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* ── Step indicator ──────────────────────────────────────────────── */}
        <View style={styles.stepRow}>
          <StepIndicator total={3} current={1} />
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

          {/* ── Title & Subtitle ──────────────────────────────────────────── */}
          <Text style={styles.title}>Check your inbox</Text>
          <Text style={styles.subtitle}>
            We&apos;ve sent a 6-digit verification code to
          </Text>
          <Text style={styles.emailHighlight}>{email || 'your email'}</Text>

          {/* ── 6 Digit Input Boxes ───────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.otpContainer,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => {
                  inputRefs.current[i] = ref;
                }}
                style={[
                  styles.box,
                  focusedIndex === i && styles.boxFocused,
                  digit !== '' && styles.boxFilled,
                  error !== '' && styles.boxError,
                ]}
                value={digit}
                onChangeText={(text) => handleChangeText(text, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocusedIndex(i)}
                onBlur={() => setFocusedIndex(-1)}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                selectTextOnFocus
                editable={!isVerifying}
                textContentType={i === 0 ? 'oneTimeCode' : 'none'}
                autoComplete={i === 0 ? 'sms-otp' : 'off'}
                textAlign="center"
                accessibilityLabel={`Digit ${i + 1} of 6`}
              />
            ))}
          </Animated.View>

          {/* ── Loading Spinner ───────────────────────────────────────────── */}
          {isVerifying && (
            <View style={styles.spinnerRow}>
              <ActivityIndicator size="small" color={colors.brand[700]} />
              <Text style={styles.spinnerText}>Verifying code...</Text>
            </View>
          )}

          {/* ── Error Banner ──────────────────────────────────────────────── */}
          {error !== '' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          )}

          {/* ── Info Banner (Resent success) ──────────────────────────────── */}
          {infoMessage !== '' && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>{infoMessage}</Text>
            </View>
          )}

          {/* ── Resend Section ────────────────────────────────────────────── */}
          <View style={styles.resendSection}>
            {secondsLeft > 0 ? (
              <Text style={styles.cooldownText}>
                Resend code in <Text style={styles.cooldownTimer}>{formattedCooldown}</Text>
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                accessibilityLabel="Resend verification code"
                style={styles.resendBtn}
              >
                {isResending ? (
                  <ActivityIndicator size="small" color={colors.brand[700]} />
                ) : (
                  <Text style={styles.resendLink}>Resend code</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ── Wrong email? Go back ──────────────────────────────────────── */}
          <View style={styles.wrongEmailRow}>
            <Text style={styles.wrongEmailText}>Wrong email address?</Text>
            <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back to change email">
              <Text style={styles.wrongEmailLink}> Go back</Text>
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
    ...shadows.sm,
  },
  backArrow: {
    fontSize: fontSizes.lg,
    color: colors.brand[900],
    fontWeight: fontWeights.bold,
    marginTop: -2,
  },
  headerTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.brand[900],
  },

  // Step indicator
  stepRow: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[10],
    alignItems: 'center',
  },

  // Mascot
  mascot: {
    width: 90,
    height: 90,
    marginTop: spacing[3],
    marginBottom: spacing[4],
  },

  // Title & Subtitle
  title: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.extrabold,
    color: colors.brand[900],
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.grey[500],
    textAlign: 'center',
  },
  emailHighlight: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.bold,
    color: colors.brand[800],
    textAlign: 'center',
    marginBottom: spacing[8],
  },

  // OTP boxes
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[2],
    marginBottom: spacing[6],
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.brand[200],
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.bold,
    color: colors.brand[900],
    ...shadows.sm,
  },
  boxFocused: {
    borderColor: colors.brand[700],
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  boxFilled: {
    borderColor: colors.brand[500],
    backgroundColor: colors.white,
  },
  boxError: {
    borderColor: colors.danger,
  },

  // Loading spinner
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  spinnerText: {
    fontSize: fontSizes.sm,
    color: colors.brand[700],
    fontWeight: fontWeights.medium,
  },

  // Banners
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    width: '100%',
  },
  errorBannerText: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    textAlign: 'center',
    fontWeight: fontWeights.medium,
  },
  infoBanner: {
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[200],
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
    width: '100%',
  },
  infoBannerText: {
    fontSize: fontSizes.sm,
    color: colors.brand[800],
    textAlign: 'center',
    fontWeight: fontWeights.medium,
  },

  // Resend
  resendSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
    marginBottom: spacing[6],
    minHeight: 32,
  },
  cooldownText: {
    fontSize: fontSizes.sm,
    color: colors.grey[400],
  },
  cooldownTimer: {
    fontWeight: fontWeights.bold,
    color: colors.brand[700],
  },
  resendBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
  },
  resendLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[700],
  },

  // Wrong email
  wrongEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  wrongEmailText: {
    fontSize: fontSizes.sm,
    color: colors.grey[500],
  },
  wrongEmailLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand[700],
  },
});
