-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Allow caregivers to read watched person's profile name & sync sign-up name
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Allow accepted caregivers to read the profile (name) of the people they are watching over
CREATE POLICY "caregiver reads watched profile"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM caregivers
      WHERE caregivers.user_id = profiles.id
        AND caregivers.caregiver_user_id = auth.uid()
        AND caregivers.status = 'accepted'
    )
  );

-- 2. Update handle_new_user to store name from raw_user_meta_data on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name')
  ON CONFLICT (id) DO UPDATE
  SET name = COALESCE(excluded.name, profiles.name);
  RETURN new;
END;
$$;
