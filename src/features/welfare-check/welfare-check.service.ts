/**
 * Welfare-check service — caregiver-side API for the Stage 3 confirmation gate.
 *
 * Functions:
 *   getPendingWelfareCheck — fetches the open confirmation row for this
 *     caregiver/monitored-person pair (status = 'pending').
 *
 *   submitWelfareCheck — updates the caregiver's confirmation row to
 *     'person_okay' or 'person_not_okay'. The Edge Function processes
 *     this on its next cron tick.
 *
 * Security (§5): all Supabase calls isolated here.
 * RLS policies allow a caregiver to SELECT and UPDATE only their own rows.
 */
import { supabase } from '@/lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

export type WelfareDecision = 'person_okay' | 'person_not_okay';

export interface PendingConfirmation {
  id: string;
  monitored_user_id: string;
  /** Name from the monitored person's profile — joined by the service */
  monitored_person_name: string | null;
  status: 'pending' | 'person_okay' | 'person_not_okay';
  deadline_at: string;
  created_at: string;
}

export type WelfareCheckState = 'pending' | 'resolved' | 'not_requested';

export interface WelfareCheckResult {
  confirmation: PendingConfirmation | null;
  state: WelfareCheckState;
  monitored_person_name: string | null;
}

// ── Queries ────────────────────────────────────────────────────────────────────

/**
 * Returns the status and confirmation row for the given caregiver + monitored user pair.
 *
 * Distinguishes between:
 *   - 'pending'       = active welfare check awaiting response
 *   - 'resolved'      = previously completed ('person_okay' or 'person_not_okay')
 *   - 'not_requested' = monitored person is in Stage 1/2 reminder period (no Stage 3 yet)
 */
export async function getPendingWelfareCheck(
  monitoredUserId: string,
  caregiverUserId: string,
): Promise<WelfareCheckResult | null> {
  if (!monitoredUserId || !caregiverUserId) return null;

  // Fetch the monitored person's name
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', monitoredUserId)
    .maybeSingle();

  const monitoredName = profile?.name ?? null;

  // 1. Fetch pending confirmation row
  const { data: pendingData, error: pendingError } = await supabase
    .from('caregiver_confirmations')
    .select('id, monitored_user_id, status, deadline_at, created_at')
    .eq('monitored_user_id', monitoredUserId)
    .eq('caregiver_user_id', caregiverUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendingError) {
    console.error('[WelfareCheckService] getPendingWelfareCheck error:', pendingError.message);
    throw new Error(pendingError.message);
  }

  if (pendingData) {
    return {
      confirmation: {
        ...pendingData,
        monitored_person_name: monitoredName,
      },
      state: 'pending',
      monitored_person_name: monitoredName,
    };
  }

  // 2. Check if a confirmation was previously resolved
  const { data: pastData } = await supabase
    .from('caregiver_confirmations')
    .select('id, monitored_user_id, status, deadline_at, created_at')
    .eq('monitored_user_id', monitoredUserId)
    .eq('caregiver_user_id', caregiverUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pastData && (pastData.status === 'person_okay' || pastData.status === 'person_not_okay')) {
    return {
      confirmation: null,
      state: 'resolved',
      monitored_person_name: monitoredName,
    };
  }

  // 3. Otherwise, Stage 3 has not been reached yet
  return {
    confirmation: null,
    state: 'not_requested',
    monitored_person_name: monitoredName,
  };
}

// ── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Records the caregiver's welfare-check decision.
 *
 * Sets status + responded_at on the caregiver_confirmations row.
 * The Edge Function reads this on its next cron tick (within 15 min) and
 * either delivers messages or inserts stage_3_resolved.
 */
export async function submitWelfareCheck(
  caregiverUserId: string,
  confirmationId: string,
  decision: WelfareDecision,
): Promise<void> {
  if (!caregiverUserId || !confirmationId) {
    throw new Error('Missing required parameters for welfare check submission.');
  }

  const { error } = await supabase
    .from('caregiver_confirmations')
    .update({
      status:       decision,
      responded_at: new Date().toISOString(),
    })
    .eq('id', confirmationId)
    // RLS: caregiver can only update their own row
    .eq('caregiver_user_id', caregiverUserId)
    .eq('status', 'pending'); // guard against double-submit

  if (error) {
    console.error('[WelfareCheckService] submitWelfareCheck error:', error.message);
    throw new Error(error.message || 'Failed to submit welfare check response.');
  }
}
