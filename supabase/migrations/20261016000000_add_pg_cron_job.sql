
-- ============================================================
-- Migration: Schedule missed-check-in detection
-- Purpose: Invoke check-missed-checkins every 15 minutes.
-- Secrets: Supabase Vault
-- ============================================================

-- 1. Enable required extensions.
-- If an extension cannot be enabled from SQL, enable it in
-- Supabase Dashboard -> Database -> Extensions first.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Validate prerequisites and the Vault secret.
DO $migration$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE EXCEPTION
      'pg_cron is unavailable. Enable pg_cron in Supabase.';
  END IF;

  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE EXCEPTION
      'Supabase Vault is unavailable. Enable Vault first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
      AND decrypted_secret IS NOT NULL
      AND decrypted_secret <> ''
  ) THEN
    RAISE EXCEPTION
      'Vault secret service_role_key is missing or empty.';
  END IF;
END;
$migration$;

-- 3. Remove an existing job with the same name.
-- Makes this migration safe to rerun.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'check-missed-checkins';

-- 4. Schedule the Edge Function every 15 minutes.
SELECT cron.schedule(
  'check-missed-checkins',
  '*/15 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://ezejtcwknwstlrtuhsus.supabase.co/functions/v1/check-missed-checkins',

      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'service_role_key'
          LIMIT 1
        )
      ),

      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $cron$
);

-- 5. Verify registration.
DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'check-missed-checkins'
      AND active = true
  ) THEN
    RAISE EXCEPTION
      'Failed to register active check-missed-checkins cron job.';
  END IF;

  RAISE NOTICE
    'check-missed-checkins scheduled successfully: every 15 minutes.';
END;
$verify$;

-- ============================================================
-- Verification query (run separately after migration)
--
-- SELECT jobid, jobname, schedule, active
-- FROM cron.job
-- WHERE jobname = 'check-missed-checkins';
--
-- Recent execution history:
-- SELECT *
-- FROM cron.job_run_details
-- WHERE jobid = (
--   SELECT jobid FROM cron.job
--   WHERE jobname = 'check-missed-checkins'
-- )
-- ORDER BY start_time DESC
-- LIMIT 10;
--
-- To remove the job:
-- SELECT cron.unschedule(jobid)
-- FROM cron.job
-- WHERE jobname = 'check-missed-checkins';
-- ============================================================
