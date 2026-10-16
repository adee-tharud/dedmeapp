/**
 * Welfare-check React Query hooks.
 *
 * Security (§6): query keys live here, never in the screen.
 * The userId from AuthContext is passed in; never fetched inside the hook.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getPendingWelfareCheck,
  submitWelfareCheck,
  type WelfareDecision,
} from './welfare-check.service';

// ── Query keys ─────────────────────────────────────────────────────────────────

export const welfareCheckKeys = {
  pending: (monitoredUserId: string, caregiverUserId: string) =>
    ['welfare-check', 'pending', monitoredUserId, caregiverUserId] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Fetches the open welfare-check confirmation for the given pair.
 * Returns null (not an error) if there is no pending row.
 */
export function usePendingWelfareCheck(
  monitoredUserId: string,
  caregiverUserId: string,
) {
  return useQuery({
    queryKey: welfareCheckKeys.pending(monitoredUserId, caregiverUserId),
    queryFn:  () => getPendingWelfareCheck(monitoredUserId, caregiverUserId),
    // Disable if either ID is missing (screen has not mounted yet)
    enabled:  Boolean(monitoredUserId && caregiverUserId),
    // Re-fetch every 60s so the countdown stays accurate and we detect
    // if another caregiver already responded
    refetchInterval: 60_000,
  });
}

/**
 * Submits the caregiver's welfare-check decision.
 *
 * Usage:
 *   const { mutate, isPending } = useSubmitWelfareCheck(caregiverUserId);
 *   mutate({ confirmationId, decision: 'person_okay' });
 */
export function useSubmitWelfareCheck(caregiverUserId: string) {
  return useMutation({
    mutationFn: ({
      confirmationId,
      decision,
    }: {
      confirmationId: string;
      decision: WelfareDecision;
    }) => submitWelfareCheck(caregiverUserId, confirmationId, decision),
  });
}
