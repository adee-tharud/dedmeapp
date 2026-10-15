-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix Caregiver Invite Privilege Escalation & Insecure Identity Handling
--
-- 1. Drops the overly permissive "accept invite by token" table policy
--    (which allowed any authenticated user to hijack any pending invite
--    without knowing the token).
-- 2. Hardens accept_caregiver_invite RPC:
--    - Strictly derives caller identity from auth.uid() (never trusts client param)
--    - Prevents a user from accepting an invitation from their own account
--    - Enforces unexpired token check (< 72h)
--    - Revokes execute permission from anon; permits authenticated callers only
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the dangerous table-level RLS policy
DROP POLICY IF EXISTS "accept invite by token" ON public.caregivers;

-- 2. Update accept_caregiver_invite to strictly use auth.uid()
CREATE OR REPLACE FUNCTION public.accept_caregiver_invite(
  token_input text,
  caregiver_id uuid DEFAULT NULL
)
RETURNS public.caregivers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated public.caregivers;
  v_uid uuid := auth.uid();
  v_existing public.caregivers;
BEGIN
  -- 1. Must be authenticated — never trust client-supplied caregiver_id
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept an invitation.';
  END IF;

  -- 2. Lookup existing caregiver row by token
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

  -- 3. Prevent self-acceptance (a user cannot be their own caregiver)
  IF v_existing.user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot accept an invitation from your own account.';
  END IF;

  -- 4. Atomically link caregiver and mark accepted
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

-- 3. Restrict permissions: Revoke from anon, allow only authenticated
REVOKE EXECUTE ON FUNCTION public.accept_caregiver_invite(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_caregiver_invite(text, uuid) TO authenticated;
