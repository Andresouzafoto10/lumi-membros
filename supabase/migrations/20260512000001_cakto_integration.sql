-- ============================================================================
-- Cakto integration: add platform seed + OAuth token cache
-- ============================================================================

-- 1) Cache for Cakto OAuth2 access token (TTL 10h per Cakto docs)
CREATE TABLE IF NOT EXISTS cakto_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  token_type text NOT NULL DEFAULT 'Bearer',
  scope text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cakto_oauth_expires
  ON cakto_oauth_tokens(expires_at DESC);

ALTER TABLE cakto_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Only service_role (edge functions) accesses this table.
-- No policies => default deny for anon/authenticated roles.

-- 2) Seed Cakto platform (inactive by default)
INSERT INTO webhook_platforms (name, slug, label, active)
VALUES ('Cakto', 'cakto', 'Cakto', false)
ON CONFLICT DO NOTHING;
