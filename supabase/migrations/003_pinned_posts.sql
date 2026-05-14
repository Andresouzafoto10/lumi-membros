-- Migration 003: pinned_posts multi-scope

-- 1. Enum
CREATE TYPE pin_scope AS ENUM ('community', 'feed', 'sidebar');

-- 2. Tabela
CREATE TABLE pinned_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  scope pin_scope NOT NULL,
  community_id uuid REFERENCES communities(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  pinned_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT scope_community_consistency CHECK (
    (scope = 'community' AND community_id IS NOT NULL) OR
    (scope IN ('feed', 'sidebar') AND community_id IS NULL)
  )
);

-- 3. Índices
CREATE UNIQUE INDEX pinned_posts_unique
  ON pinned_posts (post_id, scope, COALESCE(community_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX pinned_posts_scope_idx ON pinned_posts (scope, pinned_at DESC);
CREATE INDEX pinned_posts_community_idx ON pinned_posts (community_id, pinned_at DESC)
  WHERE community_id IS NOT NULL;

-- 4. Trigger limite de 3
CREATE OR REPLACE FUNCTION enforce_pinned_posts_limit()
RETURNS trigger AS $$
DECLARE
  cnt int;
BEGIN
  SELECT COUNT(*) INTO cnt FROM pinned_posts
  WHERE scope = NEW.scope
    AND community_id IS NOT DISTINCT FROM NEW.community_id;
  IF cnt >= 3 THEN
    RAISE EXCEPTION 'Limite de 3 posts fixados por destino' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_pinned_posts_limit_trg
  BEFORE INSERT ON pinned_posts
  FOR EACH ROW EXECUTE FUNCTION enforce_pinned_posts_limit();

-- 5. RLS
ALTER TABLE pinned_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pinned_posts_select_authenticated" ON pinned_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pinned_posts_admin_write" ON pinned_posts
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "pinned_posts_moderator_write" ON pinned_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'moderator'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'moderator'));

-- 6. Migrar pins existentes do campo communities.pinned_post_id
INSERT INTO pinned_posts (post_id, scope, community_id, pinned_at, pinned_by)
SELECT
  c.pinned_post_id,
  'community'::pin_scope,
  c.id,
  COALESCE(c.created_at, now()),
  (SELECT id FROM profiles WHERE role = 'owner' LIMIT 1)
FROM communities c
WHERE c.pinned_post_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM community_posts WHERE id = c.pinned_post_id);

-- 7. Dropar campo legacy
ALTER TABLE communities DROP COLUMN pinned_post_id;
