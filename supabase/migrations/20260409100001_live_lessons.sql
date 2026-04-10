-- ============================================================
-- Live Lessons — scheduled live classes with meeting URL
-- ============================================================

CREATE TABLE IF NOT EXISTS live_lessons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  cover_url text,
  instructor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  instructor_name text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  meeting_url text,              -- Zoom/Meet/Mux URL pasted by admin
  recording_url text,            -- URL of the archived recording
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,  -- optional link to a course
  class_ids uuid[] DEFAULT '{}', -- which classes have access
  access_mode text NOT NULL DEFAULT 'all',  -- all / classes / open
  status text NOT NULL DEFAULT 'scheduled', -- scheduled / live / ended / recorded / cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_live_lessons_updated
  BEFORE UPDATE ON live_lessons
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE INDEX idx_live_lessons_scheduled ON live_lessons(scheduled_at DESC);
CREATE INDEX idx_live_lessons_status ON live_lessons(status);

-- ============================================================
-- Participants (join log) — used for attendance tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS live_lesson_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  live_lesson_id uuid NOT NULL REFERENCES live_lessons(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(live_lesson_id, student_id)
);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE live_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_lesson_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read live lessons"
  ON live_lessons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin full access live lessons"
  ON live_lessons FOR ALL
  USING (is_admin_user());

CREATE POLICY "Anyone authenticated can read participants"
  ON live_lesson_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Students can record own participation"
  ON live_lesson_participants FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admin full access participants"
  ON live_lesson_participants FOR ALL
  USING (is_admin_user());
