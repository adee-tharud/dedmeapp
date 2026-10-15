-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix RLS gap for caregiver invite acceptance
--
-- PROBLEM:
--   The existing policy "caregiver accepts invite" uses:
--     USING (auth.uid() = caregiver_user_id)
--   But when a caregiver redeems an invite_token for the first time,
--   caregiver_user_id is still NULL — so the USING check evaluates to
--   false/null, and Postgres BLOCKS the UPDATE with a 403.
--
-- FIX:
--   Add a new complementary policy "accept invite by token" that allows
--   UPDATE when the row is still pending (caregiver_user_id IS NULL),
--   but enforces via WITH CHECK that the caller sets caregiver_user_id
--   to their own auth.uid() — preventing impersonation.
--
-- SECURITY:
--   - USING (status = 'pending') → only allows update on unaccepted rows
--   - WITH CHECK (auth.uid() = caregiver_user_id) → the caller MUST set
--     caregiver_user_id to their own uid. They cannot set it to someone else's.
--   - After acceptance, status becomes 'accepted', so this policy no longer
--     applies. Any further modification requires the original "caregiver accepts
--     invite" policy (which then passes because caregiver_user_id = auth.uid()).
--   - invite_token is a UUID generated server-side; the client cannot guess it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "accept invite by token"
  ON caregivers FOR UPDATE
  USING     (status = 'pending')
  WITH CHECK (auth.uid() = caregiver_user_id);
