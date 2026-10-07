/**
 * Caregivers hooks — React Query wrappers over caregivers.service.ts.
 *
 * Screens import these hooks; they never call service functions directly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCaregivers, saveCaregiver } from './caregivers.service';
import type { SaveCaregiverInput } from './caregivers.service';

// ── Query key namespace ───────────────────────────────────────────────────────

export const caregiverKeys = {
  all: ['caregivers'] as const,
  byUser: (userId: string) => [...caregiverKeys.all, userId] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches all caregivers for the current user.
 */
export function useCaregivers(userId: string) {
  return useQuery({
    queryKey: caregiverKeys.byUser(userId),
    queryFn: () => getCaregivers(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Saves a new caregiver and invalidates the caregivers list.
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
