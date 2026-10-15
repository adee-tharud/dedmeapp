/**
 * Auth API functions — all Supabase auth calls live here, never directly
 * in component JSX-adjacent code (Security Guide §5).
 *
 * Each function surfaces the real Supabase error to the caller (§4):
 * never navigate forward on failure or swallow the error silently.
 */
import { supabase } from '@/lib/supabase';
import type { SignUpInput, SignInInput, VerifyOtpInput } from './auth.schema';
import { recordSessionStart, clearSessionMetadata } from './session.service';

/**
 * Sign up a new user with email + password.
 * On success, Supabase sends a 6-digit OTP to the email address.
 * The caller should navigate to the verify-otp screen to complete verification.
 *
 * Returns the user (without a session — session is granted after OTP is verified).
 * Throws an AuthError on failure so the calling component can display it.
 */
export async function signUp({ name, email, password }: SignUpInput) {
  const trimmedName = name.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // No emailRedirectTo — OTP flow does not use deep links
      data: {
        name: trimmedName,
      },
    },
  });
  if (error) throw error;

  // Best-effort immediate write to profiles table if user is available
  if (data?.user?.id) {
    try {
      await supabase
        .from('profiles')
        .update({ name: trimmedName })
        .eq('id', data.user.id);
    } catch {
      // Handled by handle_new_user database trigger fallback
    }
  }

  return data;
}

/**
 * Sign in an existing user with email + password.
 * Throws the real Supabase AuthError on failure (e.g. "Invalid login
 * credentials") so the UI can surface it — never silently succeed.
 *
 * Upon successful sign-in, begins a fresh 30-day session tracking window.
 */
export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data?.session) {
    await recordSessionStart();
  }
  return data;
}

/**
 * Sign out the current user and clear their session and 30-day metadata from SecureStore.
 */
export async function signOut() {
  await clearSessionMetadata();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Verify a 6-digit OTP code that Supabase sent to the user's email.
 * On success, Supabase establishes a full session for the user and records the session start.
 *
 * type = 'signup'   → verifying a new sign-up
 * type = 'email'    → verifying an email change
 * type = 'magiclink'→ verifying a passwordless sign-in
 * type = 'recovery' → verifying a password reset
 */
export async function verifyOtp({ email, token, type }: VerifyOtpInput) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });
  if (error) throw error;
  if (data?.session) {
    await recordSessionStart();
  }
  return data;
}

/**
 * Resend the OTP (or confirmation email) to the given address.
 * Should only be callable after the client-side cooldown (60 s) to avoid
 * flooding; Supabase also applies its own server-side rate limit.
 */
export async function resendOtp(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
  });
  if (error) throw error;
}

/**
 * Get the currently authenticated user from the verified session.
 * Prefer this over getSession().user — getUser() re-validates the token
 * against Supabase's servers (Security Guide §6).
 */
export async function getAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
