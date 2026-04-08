-- ============================================================
-- Webhook Integrations (Ticto, Hotmart, Eduzz, Monetizze)
-- ============================================================

-- 1. Plataformas de webhook configuradas pelo admin
CREATE TABLE IF NOT EXISTS webhook_platforms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  secret_key text,
  active boolean NOT NULL DEFAULT false,
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Mapeamento: produto externo → turma no Lumi
CREATE TABLE IF NOT EXISTS webhook_mappings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_id uuid NOT NULL REFERENCES webhook_platforms(id) ON DELETE CASCADE,
  external_product_id text NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform_id, external_product_id)
);

-- 3. Log de eventos recebidos
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  platform_id uuid REFERENCES webhook_platforms(id) ON DELETE SET NULL,
  payload jsonb,
  student_email text,
  student_name text,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_webhook_logs_created ON webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_platform ON webhook_logs(platform_id);
CREATE INDEX idx_webhook_mappings_platform ON webhook_mappings(platform_id);

-- Auto-update updated_at
CREATE TRIGGER set_webhook_platforms_updated
  BEFORE UPDATE ON webhook_platforms
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE webhook_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access webhook_platforms"
  ON webhook_platforms FOR ALL USING (is_admin_user());

CREATE POLICY "Admin full access webhook_mappings"
  ON webhook_mappings FOR ALL USING (is_admin_user());

CREATE POLICY "Admin full access webhook_logs"
  ON webhook_logs FOR ALL USING (is_admin_user());

-- Seed default platforms
INSERT INTO webhook_platforms (name, slug, active) VALUES
  ('Ticto', 'ticto', false),
  ('Hotmart', 'hotmart', false),
  ('Eduzz', 'eduzz', false),
  ('Monetizze', 'monetizze', false)
ON CONFLICT (slug) DO NOTHING;
