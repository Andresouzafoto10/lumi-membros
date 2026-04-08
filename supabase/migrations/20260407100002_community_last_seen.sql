-- ============================================================
-- Community Last Seen (migrated from localStorage)
-- ============================================================

CREATE TABLE IF NOT EXISTS community_last_seen (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_id)
);

ALTER TABLE community_last_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own last_seen"
  ON community_last_seen FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
