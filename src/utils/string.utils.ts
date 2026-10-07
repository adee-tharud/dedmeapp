/**
 * String utility functions — pure, zero side-effects.
 */

/**
 * Returns a greeting based on the current hour.
 * e.g. "Good morning", "Good afternoon", "Good evening"
 */
export function timeBasedGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Truncates a message body to at most `maxLength` chars and wraps in quotes.
 * Newlines are collapsed to spaces.
 *
 * Used for message list previews — never shows the full sensitive content.
 */
export function bodyPreview(body: string, maxLength = 60): string {
  const trimmed = body.replace(/\n/g, ' ').trim();
  if (trimmed.length <= maxLength) return `"${trimmed}"`;
  return `"${trimmed.slice(0, maxLength)}…"`;
}

/**
 * Returns the first letter of a name, upper-cased, for use in avatar circles.
 * Falls back to '?' for empty strings.
 */
export function avatarInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/**
 * Capitalises the first letter of a string.
 */
export function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
