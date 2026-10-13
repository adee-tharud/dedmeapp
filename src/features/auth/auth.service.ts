/**
 * Auth API functions — all Supabase auth calls live here, never directly
 * in component JSX-adjacent code (Security Guide §5).
 *
 * Each function surfaces the real Supabase error to the caller (§4):
 * never navigate forward on failure or swallow the error silently.
 */
import { supabase } from '@/lib/supabase';
import type { SignUpInput, SignInInput } from './auth.schema';

/**
 * Sign up a new user with email + password.
 * On success, Supabase also creates a row in auth.users; the database trigger
 * will create the corresponding profiles row (or we insert it here).
 *
 * Returns the session on success, throws an AuthError on failure so the
 * calling component can display it to the user.
 *
 * emailRedirectTo uses the app's custom URL scheme ("deadme://") so the
 * confirmation email link deep-links back into the app instead of localhost.
 */
export async function signUp({ name, email, password }: SignUpInput) {
  const trimmedName = name.trim();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'deadme://auth/confirm',
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
 */
export async function signIn({ email, password }: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

/**
 * Sign out the current user and clear their session from SecureStore.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
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
