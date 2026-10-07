/**
 * Settings service — wraps profile operations for the settings screen.
 *
 * Delegating to profile.service.ts keeps the service focused; this layer
 * adds any settings-specific transformation or validation before persisting.
 *
 * Security Guide §5: all Supabase calls isolated here, never inline in JSX.
 */
import { updateProfile } from '@/features/auth/profile.service';
import type { Database } from '@/types';

type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export interface UpdateSettingsInput {
  name?: string | null;
  checkInFrequencyDays?: number;
  reminderTime?: string;
  gracePeriodHours?: number;
}

/**
 * Updates settings-related profile fields for the given user.
 */
export async function updateSettings(
  userId: string,
  input: UpdateSettingsInput,
) {
  const update: ProfileUpdate = {};

  if (input.name !== undefined) update.name = input.name;
  if (input.checkInFrequencyDays !== undefined) update.check_in_frequency_days = input.checkInFrequencyDays;
  if (input.reminderTime !== undefined) update.reminder_time = input.reminderTime;
  if (input.gracePeriodHours !== undefined) update.grace_period_hours = input.gracePeriodHours;

  return updateProfile(userId, update);
}
