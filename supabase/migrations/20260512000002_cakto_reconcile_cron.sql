-- ============================================================================
-- Cakto reconcile daily cron schedule
-- ============================================================================
-- Requires:
--   - Edge function env CAKTO_RECONCILE_CRON_SECRET set to the same value
--     stored in Vault under the name 'cakto_reconcile_cron_secret'.
--
-- 1) Enable required extensions (pg_cron + pg_net + supabase_vault)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Store the cron secret in Supabase Vault (encrypted at rest).
-- This same value MUST be set as edge function env CAKTO_RECONCILE_CRON_SECRET.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cakto_reconcile_cron_secret') THEN
    PERFORM vault.create_secret(
      '8c0e293b9bc10c1a10ea964b50ce90a3d701113fbd4b4f36547a98beb4c6446d',
      'cakto_reconcile_cron_secret',
      'Shared secret used by pg_cron to invoke cakto-reconcile edge function'
    );
  END IF;
END $$;

-- 3) Unschedule existing job (idempotent re-run)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cakto-reconcile-daily') THEN
    PERFORM cron.unschedule('cakto-reconcile-daily');
  END IF;
END $$;

-- 4) Schedule daily run at 06:00 UTC (03:00 BRT) — reconcile last 24h orders
SELECT cron.schedule(
  'cakto-reconcile-daily',
  '0 6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://gdbkbeurjjtjgmrmfngk.supabase.co/functions/v1/cakto-reconcile',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cakto_reconcile_cron_secret' LIMIT 1)
    ),
    body := jsonb_build_object('hours', 24)
  );
  $cron$
);
