-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Secure RPC function to accept caregiver invites
--
-- WHY THIS IS NEEDED:
--   Postgres RLS requires SELECT permission on rows in order to execute an
--   UPDATE with a WHERE filter and RETURNING clause. Because the caregiver is
--   not linked to the row yet, standard RLS SELECT policies hide the row
--   from them, causing direct client UPDATEs to update 0 rows (PGRST116).
--
--   Using a SECURITY DEFINER function safely bypasses RLS for this specific
--   single-token redemption, updates the row atomically, and returns it.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accept_caregiver_invite(token_input text, caregiver_id uuid)
RETURNS public.caregivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated public.caregivers;
  v_uid uuid := coalesce(auth.uid(), caregiver_id);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  UPDATE public.caregivers
  SET
    caregiver_user_id = v_uid,
    accepted_at       = now(),
    status            = 'accepted'
  WHERE invite_token = token_input::uuid
    AND status       = 'pending'
  RETURNING * INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'Invite code not found or already used.';
  END IF;

  RETURN v_updated;
END;
$$;

-- Allow authenticated and anon callers to execute the function
GRANT EXECUTE ON FUNCTION public.accept_caregiver_invite(text, uuid) TO authenticated, anon;
