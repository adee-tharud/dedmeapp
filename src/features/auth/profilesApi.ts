/**
 * Profiles API — read and write rows from the `profiles` table.
 *
 * Security Guide §5: all Supabase calls isolated here, never inline in JSX.
 */
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type ProfileRow    = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

/**
 * Fetch the current user's profile row.
 * Returns null if the row does not exist yet.
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Upsert a profile row — safe to call even if the row already exists
 * (e.g. created by a database trigger on auth.users).
 */
export async function upsertProfile(profile: ProfileInsert): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(profile as any)
    .select()
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

/**
 * Update specific fields on the current user's profile.
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate,
): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from('profiles')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(updates as unknown as never)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data as ProfileRow;
}
