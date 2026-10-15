/**
 * Session Lifecycle Service — manages the 30-day (1-month) session window
 * in Expo SecureStore (device Keychain on iOS / Keystore on Android).
 *
 * Supabase Security Guide §4 & §5:
 * - Sensitive session metadata lives in SecureStore, never plain AsyncStorage.
 * - All session business logic is encapsulated under src/features/auth/.
 */
import * as SecureStore from 'expo-secure-store';

const SESSION_CREATED_AT_KEY = 'deadme_session_created_at';

/**
 * 30 days in milliseconds (1 month):
 * 30 days * 24 hours * 60 minutes * 60 seconds * 1000 ms = 2,592,000,000 ms.
 */
export const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Persists the timestamp when an authenticated session is established.
 */
export async function recordSessionStart(timestamp: number = Date.now()): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_CREATED_AT_KEY, timestamp.toString());
  } catch (error) {
    console.error('[SessionService] Failed to record session start:', error);
  }
}

/**
 * Reads the session start timestamp from SecureStore.
 * Returns null if no timestamp has been saved yet.
 */
export async function getSessionStartTime(): Promise<number | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_CREATED_AT_KEY);
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (error) {
    console.error('[SessionService] Failed to read session start time:', error);
    return null;
  }
}

/**
 * Evaluates whether the current session has exceeded the 30-day (1-month) limit.
 *
 * If no timestamp exists yet (e.g. an existing session before this feature was introduced),
 * returns false and allows the caller to initialize the timestamp.
 */
export async function isSessionExpired(maxDurationMs: number = ONE_MONTH_MS): Promise<boolean> {
  const startTime = await getSessionStartTime();
  if (startTime === null) {
    return false;
  }

  const elapsed = Date.now() - startTime;
  // If the clock was corrupted or skewed negatively by more than 1 day, treat as invalid
  if (elapsed < -86400000) {
    return true;
  }

  return elapsed > maxDurationMs;
}

/**
 * Removes the session timestamp from SecureStore.
 * Called when a session is explicitly terminated via sign-out or expired.
 */
export async function clearSessionMetadata(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SESSION_CREATED_AT_KEY);
  } catch (error) {
    console.error('[SessionService] Failed to clear session metadata:', error);
  }
}
