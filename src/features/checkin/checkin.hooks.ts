/**
 * Check-in hooks — React Query wrappers over checkin.service.ts.
 *
 * Screens import these hooks; they never call service functions directly.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLatestCheckIn, recordCheckIn, checkInKeys } from './checkin.service';

export { checkInKeys };

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches the most recent check-in for the given user.
 */
export function useLatestCheckIn(userId: string) {
  return useQuery({
    queryKey: checkInKeys.latest(userId),
    queryFn: () => fetchLatestCheckIn(userId),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Records a new check-in. Invalidates the latest-check-in query on success
 * so the dashboard refreshes immediately.
 */
export function useRecordCheckIn(userId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => recordCheckIn(userId),
    onSuccess: (data) => {
      qc.setQueryData(checkInKeys.latest(userId), data);
      qc.invalidateQueries({ queryKey: checkInKeys.latest(userId) });
    },
  });
}
