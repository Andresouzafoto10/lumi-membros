-- ============================================================================
-- Add Cakto offer support to webhook_mappings
-- ----------------------------------------------------------------------------
-- Previously: 1 product → 1+ classes (UNIQUE on platform_id+external_product_id)
-- Now: 1 product+offer → 1+ classes (UNIQUE on platform_id+external_product_id+external_offer_id)
-- offer is NULLable. When offer is NULL the mapping matches ANY offer of that product
-- (fallback). Webhook matching priority: exact offer match → product-only fallback.
-- ============================================================================

ALTER TABLE webhook_mappings
  ADD COLUMN IF NOT EXISTS external_offer_id text;

ALTER TABLE webhook_mappings
  DROP CONSTRAINT IF EXISTS webhook_mappings_platform_id_external_product_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS webhook_mappings_unique_with_offer
  ON webhook_mappings (
    platform_id,
    external_product_id,
    COALESCE(external_offer_id, '__null__')
  );

CREATE INDEX IF NOT EXISTS idx_webhook_mappings_offer
  ON webhook_mappings(external_offer_id)
  WHERE external_offer_id IS NOT NULL;
