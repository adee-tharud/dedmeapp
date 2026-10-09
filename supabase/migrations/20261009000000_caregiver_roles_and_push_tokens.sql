-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Caregiver role system (Option B) + push notification tokens
--
-- DESIGN DECISION: No role column is added anywhere.
-- A user's role is inferred from their position in the caregivers table:
--   caregivers.user_id           → they are the monitored person
--   caregivers.caregiver_user_id → they are acting as a caregiver
--
-- A single user can appear in BOTH positions simultaneously — meaning
-- they are being monitored AND watching over someone else at the same time.
-- This is intentional and fully supported.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Extend the caregivers table ───────────────────────────────────────────
--
-- caregiver_user_id:
--   Links the caregiver row to an actual Supabase auth account.
--   NULL when the caregiver has been invited by email but has not yet
--   signed up or redeemed their invite_token. Becomes non-null the moment
--   the caregiver accepts the invite in the app.
--
-- accepted_at:
--   Records the exact timestamp of acceptance. NULL while status = 'pending'.
--   Use this (not status) as the canonical truth for "has this been accepted?"
--   because it is immutable once set.
--
-- ON DELETE SET NULL:
--   If the caregiver deletes their account, the monitored person's row is
--   preserved but the link is severed — their caregiver goes back to pending
--   state. The monitored person keeps their data and can re-invite.

ALTER TABLE caregivers
  ADD COLUMN caregiver_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN accepted_at       timestamptz;


-- ── 2. Indexes on caregivers ─────────────────────────────────────────────────

-- Fast lookup by invite_token during the acceptance flow
-- (SELECT * FROM caregivers WHERE invite_token = $1)
CREATE INDEX caregivers_invite_token_idx
  ON caregivers (invite_token);

-- Fast lookup for the Edge Function:
-- "Find all accepted caregivers for user X so we can send them push notifications"
-- (SELECT caregiver_user_id FROM caregivers WHERE user_id = $1 AND caregiver_user_id IS NOT NULL)
CREATE INDEX caregivers_user_caregiver_idx
  ON caregivers (user_id, caregiver_user_id);

-- Fast lookup for the caregiver dashboard:
-- "Which monitored people am I watching over?" (SELECT * FROM caregivers WHERE caregiver_user_id = $1)
CREATE INDEX caregivers_caregiver_user_id_idx
  ON caregivers (caregiver_user_id);


-- ── 3. New RLS policies on caregivers ────────────────────────────────────────
--
-- Existing policy "own caregivers" allows the monitored person (user_id) to
-- do everything. We add two more policies for the caregiver side.
-- Policies are additive — existing rows and policies are untouched.

-- Caregivers can SELECT their own linked rows so they can see
-- who they are watching over and what their acceptance status is.
CREATE POLICY "caregiver reads own link"
  ON caregivers FOR SELECT
  USING (auth.uid() = caregiver_user_id);

-- Caregivers can UPDATE only their own row to redeem the invite.
-- The WITH CHECK prevents them from changing user_id or any other
-- field that does not belong to them.
CREATE POLICY "caregiver accepts invite"
  ON caregivers FOR UPDATE
  USING     (auth.uid() = caregiver_user_id)
  WITH CHECK (auth.uid() = caregiver_user_id);


-- ── 4. push_tokens table ─────────────────────────────────────────────────────
--
-- Stores Expo push tokens — one row per user per device.
-- A user may have multiple devices so (user_id, token) is UNIQUE, not user_id alone.
--
-- References auth.users directly (not profiles) because:
--   a) Push tokens are a device-level concept, not tied to app profile data.
--   b) Caregivers may have a valid push token before their profile is fully set up.
--
-- Tokens are never UPDATEd. When a token changes, the old row is deleted
-- and a new one is inserted (or upserted via ON CONFLICT DO NOTHING).

CREATE TABLE push_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text        NOT NULL,
  platform   text        NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Prevents duplicate token registrations for the same user+device pair
  UNIQUE (user_id, token)
);


-- ── 5. RLS on push_tokens ────────────────────────────────────────────────────
--
-- Users manage only their own tokens from the client.
-- Supabase Edge Functions use the service-role key, which bypasses RLS,
-- to READ tokens for push dispatch — no SELECT policy needed for that path.

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push tokens insert"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own push tokens select"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "own push tokens delete"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);


-- ── 6. Index on push_tokens ──────────────────────────────────────────────────

-- Fast lookup for push dispatch:
-- "Give me all push tokens for this list of caregiver user_ids"
CREATE INDEX push_tokens_user_id_idx
  ON push_tokens (user_id);
