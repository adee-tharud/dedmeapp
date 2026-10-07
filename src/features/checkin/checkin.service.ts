/**
 * Check-in API — all Supabase calls for the check_ins table.
 *
 * Security Guide §5: supabase calls are isolated here, never inline in JSX.
 * Security Guide §6: namespaced React Query keys for precise invalidation.
 * Security Guide §8: idempotency — one check-in per day max.
 */
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type CheckInRow = Database['public']['Tables']['check_ins']['Row'];

// ── Query key namespace ────────────────────────────────────────────────────────
// §6: namespace per feature so invalidation is precise.
export const checkInKeys = {
  all: ['check_ins'] as const,
  latest: (userId: string) => [...checkInKeys.all, userId, 'latest'] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch the most recent check-in for a user.
 * Returns null if the user has never checked in.
 *
 * §6: throw on error so React Query's error state triggers correctly.
 */
export async function fetchLatestCheckIn(userId: string): Promise<CheckInRow | null> {
  const { data, error } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Record a new check-in for the given user.
 *
 * §8: idempotent — if the user already checked in today, silently skips the
 * insert and returns the existing row. This prevents double-inserts from
 * rapid taps or retried requests.
 *
 * §3: user_id is always the authenticated user's id from the session,
 * never a value passed in from untrusted client state.
 */
export async function recordCheckIn(userId: string): Promise<CheckInRow> {
  // Idempotency guard: check if user already checked in today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: existing, error: existingError } = await supabase
    .from('check_ins')
    .select('*')
    .eq('user_id', userId)
    .gte('checked_in_at', todayStart.toISOString())
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing; // already checked in today — return existing row

  // Insert a new check-in
  const { data, error } = await supabase
    .from('check_ins')
    .insert({ user_id: userId } as any)  
    .select()
    .single();

  if (error) throw error;
  return data as CheckInRow;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the given check-in timestamp is from today.
 */
export function isCheckedInToday(checkedInAt: string | null | undefined): boolean {
  if (!checkedInAt) return false;
  const checkedDate = new Date(checkedInAt);
  const today = new Date();
  return (
    checkedDate.getFullYear() === today.getFullYear() &&
    checkedDate.getMonth() === today.getMonth() &&
    checkedDate.getDate() === today.getDate()
  );
}

/**
 * Given a profile's check_in_frequency_days and a last check-in timestamp,
 * returns a human-readable string for how long until the next check-in is due.
 * e.g. "1 day 4 hours" or "3 hours 20 minutes"
 */
export function nextCheckInDue(
  lastCheckedInAt: string | null,
  frequencyDays: number,
): string {
  if (!lastCheckedInAt) return 'now';

  const last = new Date(lastCheckedInAt);
  const dueAt = new Date(last.getTime() + frequencyDays * 24 * 60 * 60 * 1000);
  const diffMs = dueAt.getTime() - Date.now();

  if (diffMs <= 0) return 'overdue';

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0 && hours > 0) return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''}`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0 && minutes > 0) return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} min`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${minutes} min`;
}
