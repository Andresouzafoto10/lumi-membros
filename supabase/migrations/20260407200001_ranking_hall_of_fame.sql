-- ============================================================
-- Ranking Hall of Fame — monthly top 3 snapshot
-- ============================================================

CREATE TABLE IF NOT EXISTS ranking_hall_of_fame (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period text NOT NULL,         -- "2026-04", "2026-03"
  position integer NOT NULL,    -- 1, 2, 3
  points integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period, position)
);

ALTER TABLE ranking_hall_of_fame ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hall of fame"
  ON ranking_hall_of_fame FOR SELECT
  USING (true);

CREATE POLICY "Admin full access hall of fame"
  ON ranking_hall_of_fame FOR ALL
  USING (is_admin_user());

CREATE INDEX idx_hall_of_fame_period ON ranking_hall_of_fame(period DESC);
