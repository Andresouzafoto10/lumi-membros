-- ============================================================================
-- Trigger: keep community_posts.comments_count in sync with post_comments
-- ----------------------------------------------------------------------------
-- Replaces error-prone client-side SELECT+UPDATE pattern in useComments.ts
-- with an atomic database-level counter. Prevents race conditions when two
-- comments are created simultaneously.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE community_posts
       SET comments_count = comments_count + 1
     WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE community_posts
       SET comments_count = GREATEST(comments_count - 1, 0)
     WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_post_comments_count ON post_comments;
CREATE TRIGGER trg_sync_post_comments_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW EXECUTE FUNCTION sync_post_comments_count();

-- One-time reconciliation of existing counts (safe to re-run).
UPDATE community_posts cp
   SET comments_count = COALESCE(
     (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = cp.id),
     0
   );
