-- ============================================================================
-- Webhook: multi-class mappings + event type tracking + idempotency support
-- ----------------------------------------------------------------------------
-- Changes:
--   1. webhook_mappings.class_ids (uuid[]) — 1 product can enroll into N classes
--   2. webhook_logs.event_type + transaction_id — for visibility & dedup
--   3. Backfill class_ids from class_id; keep class_id for backward compat
-- ============================================================================

ALTER TABLE webhook_mappings
  ADD COLUMN IF NOT EXISTS class_ids uuid[] NOT NULL DEFAULT '{}';

-- Backfill existing single-class mappings into the array form.
UPDATE webhook_mappings
   SET class_ids = ARRAY[class_id]::uuid[]
 WHERE class_id IS NOT NULL
   AND (class_ids = '{}' OR class_ids IS NULL);

-- Allow class_id to become nullable (kept for backward compat / future removal).
ALTER TABLE webhook_mappings ALTER COLUMN class_id DROP NOT NULL;

-- Event type + transaction id in logs.
ALTER TABLE webhook_logs
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS transaction_id text;

CREATE INDEX IF NOT EXISTS idx_webhook_logs_transaction
  ON webhook_logs(transaction_id)
  WHERE transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type
  ON webhook_logs(event_type);
