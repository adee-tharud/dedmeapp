-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add expiration and rate limiting tracking to caregiver invites
--
-- Adds:
--   1. invite_expires_at: 72-hour expiration window for invitation tokens
--   2. last_invite_sent_at: Timestamp tracking for rate-limiting email dispatches
--   3. Updates accept_caregiver_invite RPC to enforce token expiration
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add expiration and rate-limit tracking columns
ALTER TABLE public.caregivers
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz DEFAULT (now() + interval '72 hours'),
  ADD COLUMN IF NOT EXISTS last_invite_sent_at timestamptz;

-- 2. Update accept_caregiver_invite RPC with expiration verification
CREATE OR REPLACE FUNCTION public.accept_caregiver_invite(token_input text, caregiver_id uuid)
RETURNS public.caregivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated public.caregivers;
  v_uid uuid := coalesce(auth.uid(), caregiver_id);
  v_existing public.caregivers;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Check if token exists and check status/expiration explicitly for clear error messages
  SELECT * INTO v_existing
  FROM public.caregivers
  WHERE invite_token = token_input::uuid;

  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'Invite code not found.';
  END IF;

  IF v_existing.status = 'accepted' THEN
    RAISE EXCEPTION 'This invitation has already been accepted.';
  END IF;

  IF v_existing.invite_expires_at IS NOT NULL AND v_existing.invite_expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation has expired. Please ask the person who invited you to resend the invite.';
  END IF;

  -- Atomically link the caregiver and mark accepted
  UPDATE public.caregivers
  SET
    caregiver_user_id = v_uid,
    accepted_at       = now(),
    status            = 'accepted'
  WHERE invite_token = token_input::uuid
    AND status       = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > now())
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;
