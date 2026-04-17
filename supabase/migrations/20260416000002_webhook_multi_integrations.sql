-- ============================================================================
-- Multi-integration support for webhook_platforms
-- ----------------------------------------------------------------------------
-- Previously `webhook_platforms.slug` was UNIQUE → one row per platform type
-- (hotmart/ticto/etc). Now admins can register multiple integrations per
-- platform (e.g. two Hotmart accounts). Each row gets its own webhook_token
-- used as URL identifier; `slug` becomes just the "platform type" for
-- selecting the HMAC extractor.
-- ============================================================================

ALTER TABLE webhook_platforms
  DROP CONSTRAINT IF EXISTS webhook_platforms_slug_key;

ALTER TABLE webhook_platforms
  ADD COLUMN IF NOT EXISTS webhook_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS label text;

-- Ensure uniqueness of webhook_token (UUID v4 → collision essentially nil,
-- but enforce at DB level for safety).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'webhook_platforms_webhook_token_key'
  ) THEN
    ALTER TABLE webhook_platforms
      ADD CONSTRAINT webhook_platforms_webhook_token_key UNIQUE (webhook_token);
  END IF;
END$$;

-- Backfill label from name for existing rows.
UPDATE webhook_platforms
   SET label = COALESCE(label, name)
 WHERE label IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_platforms_token
  ON webhook_platforms(webhook_token);
CREATE INDEX IF NOT EXISTS idx_webhook_platforms_slug
  ON webhook_platforms(slug);
