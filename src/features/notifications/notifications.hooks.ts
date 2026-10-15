/**
 * Notifications hooks — React wrappers over notifications.service.ts.
 *
 * useRegisterPushToken: call once when a session is confirmed.
 *   Internally memoises the token in state so it can be passed to
 *   unregisterPushToken on sign-out.
 */
import { useEffect, useState } from 'react';
import { registerPushToken, unregisterPushToken, setupAndroidNotificationChannel } from './notifications.service';

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Registers an Expo push token for the given userId.
 *
 * - Sets up the Android notification channel on first mount.
 * - Attempts token registration whenever userId is truthy.
 * - Gracefully no-ops in Expo Go (see notifications.service for details).
 * - Returns the registered token (or null) for use in unregistration on sign-out.
 *
 * Usage:
 *   const { token } = useRegisterPushToken(user?.id ?? '');
 */
export function useRegisterPushToken(userId: string) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setupAndroidNotificationChannel();
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    registerPushToken(userId).then(t => {
      if (!cancelled) setToken(t);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  /**
   * Call this on sign-out to clean up the token from the database.
   */
  const unregister = async () => {
    if (token && userId) {
      await unregisterPushToken(userId, token);
      setToken(null);
    }
  };

  return { token, unregister };
}
