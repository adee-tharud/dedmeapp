/**
 * Check-in utilities — pure functions, zero side-effects.
 *
 * Extracted from checkin.service.ts so they can be tested and used
 * independently of any Supabase dependency.
 */

/**
 * Returns true if the given check-in timestamp is from today (local time).
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
 * e.g. "1 day 4 hours", "3 hours 20 min", "overdue", "now"
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

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const d = (n: number, unit: string) => `${n} ${unit}${n !== 1 ? 's' : ''}`;

  if (days > 0 && hours > 0) return `${d(days, 'day')} ${d(hours, 'hour')}`;
  if (days > 0) return d(days, 'day');
  if (hours > 0 && minutes > 0) return `${d(hours, 'hour')} ${minutes} min`;
  if (hours > 0) return d(hours, 'hour');
  return `${minutes} min`;
}
