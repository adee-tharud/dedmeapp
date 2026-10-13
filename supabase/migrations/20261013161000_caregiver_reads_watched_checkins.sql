-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Allow accepted caregivers to read check-ins of monitored users
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "caregiver reads watched check-ins"
  ON check_ins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.user_id = check_ins.user_id
        AND caregivers.caregiver_user_id = auth.uid()
        AND caregivers.status = 'accepted'
    )
  );
