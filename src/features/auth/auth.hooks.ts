/**
 * Auth hooks — React Query wrappers over auth.service.ts and profile.service.ts.
 *
 * All data-fetching concerns live here, not in screens.
 * Screens call these hooks; they never call service functions directly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { signIn, signOut, signUp } from './auth.service';
import { getProfile, updateProfile, upsertProfile } from './profile.service';
import type { Database } from '@/types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

// ── Query key namespace ───────────────────────────────────────────────────────

export const profileKeys = {
  all: ['profiles'] as const,
  byUser: (userId: string) => [...profileKeys.all, userId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches the current user's profile row from Supabase.
 * Returns null if the profile doesn't exist yet.
 */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  return useQuery({
    queryKey: profileKeys.byUser(userId),
    queryFn: () => getProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes — profile rarely changes
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useSignUp() {
  return useMutation({
    mutationFn: signUp,
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: signIn,
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      // Clear all cached data on sign-out
      qc.clear();
    },
  });
}

export function useUpsertProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (profile: ProfileInsert) => upsertProfile(profile),
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: profileKeys.byUser(user.id) });
      }
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (updates: ProfileUpdate) =>
      updateProfile(user?.id ?? '', updates),
    onSuccess: () => {
      if (user?.id) {
        qc.invalidateQueries({ queryKey: profileKeys.byUser(user.id) });
      }
    },
  });
}
