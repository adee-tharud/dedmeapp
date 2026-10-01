/**
 * Supabase client — uses expo-secure-store as the session storage backend.
 *
 * The anon key is intentionally EXPO_PUBLIC_ prefixed so Expo bundles it
 * into the app. The service_role key must NEVER appear here.
 *
 * Supabase Security Guide §2: only EXPO_PUBLIC_ prefixed values belong in
 * client code; service_role key lives exclusively in Edge Function secrets.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@/types/database';

// SecureStore adapter — stores the Supabase session token in the device
// Keychain (iOS) / Keystore (Android) rather than plain AsyncStorage.
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
