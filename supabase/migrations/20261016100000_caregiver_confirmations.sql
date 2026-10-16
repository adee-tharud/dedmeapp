-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Caregiver Welfare-Check Confirmation gate
--
-- PURPOSE
--   Stage 3 used to deliver messages immediately when fired. This migration
--   inserts a new "confirmation gate" between the caregiver push notification
--   and message delivery:
--
--   Stage 3 fires
--     │
--     ├─► Push sent to all caregivers with a deep-link to the welfare-check screen
--     ├─► One caregiver_confirmations row inserted per caregiver (status = 'pending')
--     └─► Messages NOT sent yet — the next cron tick decides based on this table
--
--   On every subsequent cron run, processStage3Pending() checks:
--     ├─ Any row has status = 'person_okay'?
--     │    → Mark escalation resolved; no messages sent.
--     ├─ Any row has status = 'person_not_okay'?
--     │    → Deliver messages immediately.
--     └─ All rows still 'pending' AND now() >= deadline_at?
--          → Deliver messages (auto-escalation after 36-hour timeout).
--
-- SECURITY
--   - RLS: A caregiver can only UPDATE their own row (cannot spoof another).
--   - status column uses a strict CHECK constraint so only valid values fit.
--   - escalation_events.stage 'stage_3_resolved' is the terminal happy-path
--     marker; 'stage_3' remains the marker for "alerts sent, now waiting".
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Create the table ───────────────────────────────────────────────────────
--
-- One row per caregiver per Stage 3 event.
-- Multiple caregivers can all independently respond; first 'not_okay'
-- wins (messages delivered); any 'okay' with no 'not_okay' → resolved.

CREATE TABLE caregiver_confirmations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The monitored person whose Stage 3 fired
  monitored_user_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- The caregiver who received the push notification
  caregiver_user_id uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- escalation_events row that triggered this confirmation gate
  -- (the 'stage_3' row created by the Edge Function)
  escalation_event_id uuid      REFERENCES escalation_events(id) ON DELETE CASCADE,

  -- 'pending'       — waiting for caregiver to respond
  -- 'person_okay'   — caregiver confirmed person is safe; block delivery
  -- 'person_not_okay' — caregiver confirmed emergency; trigger delivery
  status            text        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'person_okay', 'person_not_okay')),

  -- Timestamp when the caregiver tapped a button
  responded_at      timestamptz,

  -- Auto-send deadline: if still 'pending' at this time, messages are sent
  -- automatically. Set to Stage 3 fire time + 36 hours by the Edge Function.
  deadline_at       timestamptz NOT NULL,

  created_at        timestamptz NOT NULL DEFAULT now(),

  -- Each caregiver only has one open confirmation per monitored person.
  -- The Edge Function handles the case of repeated Stage 3 fires by
  -- checking for existing rows before inserting.
  UNIQUE (monitored_user_id, caregiver_user_id, escalation_event_id)
);


-- ── 2. Indexes ────────────────────────────────────────────────────────────────

-- Edge Function: "Find all pending confirmations for user X"
CREATE INDEX caregiver_confirmations_monitored_user_idx
  ON caregiver_confirmations (monitored_user_id, status);

-- Edge Function: "Find all Stage 3 pending rows past their deadline"
CREATE INDEX caregiver_confirmations_deadline_idx
  ON caregiver_confirmations (deadline_at)
  WHERE status = 'pending';

-- App: caregiver looks up their own pending confirmations
CREATE INDEX caregiver_confirmations_caregiver_user_idx
  ON caregiver_confirmations (caregiver_user_id, status);


-- ── 3. Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE caregiver_confirmations ENABLE ROW LEVEL SECURITY;


-- ── 4. RLS policies ───────────────────────────────────────────────────────────

-- Caregivers can SELECT only their own rows (to render the welfare-check UI)
CREATE POLICY "caregiver reads own confirmation"
  ON caregiver_confirmations FOR SELECT
  USING (auth.uid() = caregiver_user_id);

-- Caregivers can UPDATE only their own row (to respond to the welfare check)
-- WITH CHECK prevents changing monitored_user_id or any field they don't own.
CREATE POLICY "caregiver updates own confirmation"
  ON caregiver_confirmations FOR UPDATE
  USING     (auth.uid() = caregiver_user_id)
  WITH CHECK (auth.uid() = caregiver_user_id);

-- The monitored person can SELECT confirmations to see response status
-- (useful for a future "your caregiver responded" UI)
CREATE POLICY "monitored person reads own confirmations"
  ON caregiver_confirmations FOR SELECT
  USING (auth.uid() = monitored_user_id);

-- Edge Function uses service-role key → bypasses RLS for INSERTs and reads.
-- No public INSERT policy needed.
