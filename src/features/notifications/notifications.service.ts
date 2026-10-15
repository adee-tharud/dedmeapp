/**
 * Notifications service — Expo push token registration and unregistration.
 *
 * ⚠️  Push token retrieval only works in a DEVELOPMENT BUILD or production.
 *     It is NOT supported in Expo Go. All calls are wrapped in try/catch so
 *     the app never crashes in Expo Go — it simply skips token registration
 *     and logs a warning.
 *
 * EAS Project ID: 6e64a881-fb6d-4cad-acf8-977996dc1777
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme/tokens';

// ── Push token helpers ────────────────────────────────────────────────────────

/**
 * Requests notification permissions, gets the Expo push token,
 * and upserts it into the push_tokens table.
 *
 * Returns the token string on success, null if:
 *   - Running in Expo Go (native module unavailable)
 *   - User denied notification permissions
 *   - Any unexpected error
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  try {
    // 1. Request permission
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission not granted — push tokens not registered.');
      return null;
    }

    // 2. Get push token (requires dev build — throws in Expo Go)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? '6e64a881-fb6d-4cad-acf8-977996dc1777';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // 3. Determine platform
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';

    // 4. Upsert into push_tokens table (ON CONFLICT DO NOTHING — idempotent)
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform } as any,
        { onConflict: 'user_id,token', ignoreDuplicates: true },
      );

    if (error) {
      console.error('[Notifications] Failed to save push token:', error.message);
      return null;
    }

    return token;
  } catch (err) {
    // In Expo Go, getExpoPushTokenAsync throws:
    //   "ERROR: expo-notifications: getExpoPushTokenAsync: native module not available"
    // We log it and return null — the app continues normally.
    console.warn('[Notifications] Push token registration skipped:', err);
    return null;
  }
}

/**
 * Removes the push token from the database on sign-out.
 * Safe to call even if the token doesn't exist in the DB.
 */
export async function unregisterPushToken(
  userId: string,
  token: string,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('[Notifications] Failed to remove push token:', error.message);
    }
  } catch (err) {
    console.warn('[Notifications] unregisterPushToken error:', err);
  }
}

// ── Android notification channel (required for Android 8+) ───────────────────

/**
 * Set up the default Android notification channel.
 * Call once at app startup. Safe to call multiple times — Expo deduplicates.
 */
export function setupAndroidNotificationChannel(): void {
  if (Platform.OS !== 'android') return;
  Notifications.setNotificationChannelAsync('default', {
    name: 'Check-in alerts',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.accent.notify,
  });
}
