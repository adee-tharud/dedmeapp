/**
 * Caregivers hooks — React Query wrappers over caregivers.service.ts.
 *
 * Screens import these hooks; they never call service functions directly.
 *
 * Query key namespaces:
 *   caregiverKeys.byUser(userId)  → caregivers the MONITORED PERSON added
 *   caregiverKeys.watch(userId)   → people the CAREGIVER is watching over
 *
 * ⚠️ These two are completely different data sets. Never mix the keys.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCaregivers,
  saveCaregiver,
  acceptCaregiverInvite,
  getCaregiverWatch,
  sendCaregiverInvite,
} from './caregivers.service';
import type { SaveCaregiverInput } from './caregivers.service';

// ── Query key namespace ───────────────────────────────────────────────────────

export const caregiverKeys = {
  all:    ['caregivers'] as const,
  byUser: (userId: string) => [...caregiverKeys.all, userId] as const,
  watch:  (userId: string) => [...caregiverKeys.all, 'watch', userId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches all caregivers for the current user (monitored-person view).
 * Used on: Circle / Contacts tab.
 */
export function useCaregivers(userId: string) {
  return useQuery({
    queryKey: caregiverKeys.byUser(userId),
    queryFn: () => getCaregivers(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches all monitored people this user is watching over (caregiver view).
 * Used on: Caregiver Home tab.
 *
 * staleTime is shorter (2 min) because check-in status changes regularly.
 */
export function useCaregiverWatch(userId: string) {
  return useQuery({
    queryKey: caregiverKeys.watch(userId),
    queryFn: () => getCaregiverWatch(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Saves a new caregiver and invalidates the caregivers list.
 * Used on: (onboarding)/caregiver.tsx
 */
export function useSaveCaregiver(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveCaregiverInput) => saveCaregiver(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caregiverKeys.byUser(userId) });
    },
  });
}

/**
 * Accepts an invite token and links the signed-in user as a caregiver.
 * Used on: (onboarding)/caregiver-join.tsx  AND  (tabs)/caregiver-home.tsx sheet.
 *
 * On success, invalidates the caregiver watch list so the new person
 * appears on the dashboard immediately.
 */
export function useAcceptCaregiverInvite(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => acceptCaregiverInvite(token, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caregiverKeys.watch(userId) });
    },
  });
}

/**
 * Resends an invitation email to a pending caregiver with token rotation and rate limit handling.
 * Used on: (tabs)/contacts.tsx
 */
export function useResendCaregiverInvite(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (caregiverId: string) => sendCaregiverInvite(caregiverId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: caregiverKeys.byUser(userId) });
    },
  });
}

