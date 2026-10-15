-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix Caregiver Invite Privilege Escalation & Insecure Identity Handling
--
-- 1. Drops the overly permissive "accept invite by token" table policy
--    (which allowed any authenticated user to hijack any pending invite
--    without knowing the token).
-- 2. Hardens accept_caregiver_invite RPC:
--    - Strictly derives caller identity from auth.uid() (never trusts client param)
--    - Enforces UUID input format validation before querying
--    - Prevents a user from accepting an invitation from their own account
--    - Enforces unexpired token check (< 72h)
--    - Atomically guards against concurrent race conditions
--    - Revokes execute permission from anon; permits authenticated callers only
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the dangerous table-level RLS policy
DROP POLICY IF EXISTS "accept invite by token" ON public.caregivers;

-- 2. Drop any legacy function variants to eliminate signature ambiguity
DROP FUNCTION IF EXISTS public.accept_caregiver_invite(text);
DROP FUNCTION IF EXISTS public.accept_caregiver_invite(text, uuid);

-- 3. Create hardened accept_caregiver_invite RPC
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
  v_clean_token text := trim(token_input);
BEGIN
  -- 1. Must be authenticated — never trust client-supplied caregiver_id
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to accept an invitation.';
  END IF;

  -- 2. Validate token format (strict UUID pattern, reject NULL/empty)
  IF v_clean_token IS NULL OR v_clean_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid invite code format.';
  END IF;

  -- 3. Lookup existing caregiver row by token
  SELECT * INTO v_existing
  FROM public.caregivers
  WHERE invite_token = v_clean_token::uuid;

  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'Invite code not found.';
  END IF;

  IF v_existing.status <> 'pending' THEN
    IF v_existing.status = 'accepted' THEN
      RAISE EXCEPTION 'This invitation has already been accepted.';
    ELSE
      RAISE EXCEPTION 'This invitation is no longer active.';
    END IF;
  END IF;

  IF v_existing.invite_expires_at IS NOT NULL AND v_existing.invite_expires_at <= now() THEN
    RAISE EXCEPTION 'This invitation has expired. Please ask the person who invited you to resend the invite.';
  END IF;

  -- 4. Prevent self-acceptance (a user cannot be their own caregiver)
  IF v_existing.user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot accept an invitation from your own account.';
  END IF;

  -- 5. Atomically link caregiver and mark accepted
  UPDATE public.caregivers
  SET
    caregiver_user_id = v_uid,
    accepted_at       = now(),
    status            = 'accepted'
  WHERE invite_token = v_clean_token::uuid
    AND status       = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > now())
  RETURNING * INTO v_updated;

  -- Concurrency guard: if another request accepted the token in the same millisecond
  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'Invitation could not be accepted. It may have already been claimed.';
  END IF;

  RETURN v_updated;
END;
$$;

-- 4. Restrict permissions: Revoke from anon, allow only authenticated
REVOKE ALL ON FUNCTION public.accept_caregiver_invite(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_caregiver_invite(text, uuid) TO authenticated;
