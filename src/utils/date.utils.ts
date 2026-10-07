/**
 * Date utility functions — pure, zero side-effects, no imports from features.
 *
 * All functions are time-zone agnostic (use local device time) unless noted.
 */

/**
 * Returns a human-readable relative date string for a message timestamp.
 * e.g. "Updated today", "Updated yesterday", "Updated Jun 5"
 */
export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Updated today';
  if (diffDays === 1) return 'Updated yesterday';
  if (diffDays < 7) return `Updated ${diffDays} days ago`;

  return `Updated ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/**
 * Returns true if the given ISO timestamp string falls on today's date
 * (local time comparison).
 */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Given a frequency (days) and a last-check-in timestamp, returns a
 * human-readable string for how long until the next check-in is due.
 * e.g. "1 day 4 hours", "3 hours 20 min", "overdue", "now"
 */
export function timeUntilDue(
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
