-- ============================================================
-- Course Launches — scheduled release with notification signup
-- ============================================================

-- Add launch fields to courses table
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS launch_at timestamptz,
  ADD COLUMN IF NOT EXISTS launch_status text DEFAULT 'released'; -- "upcoming" | "released"

-- Track students interested in being notified when a course launches
CREATE TABLE IF NOT EXISTS course_launch_interests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, student_id)
);

CREATE INDEX idx_launch_interests_course ON course_launch_interests(course_id);
CREATE INDEX idx_launch_interests_student ON course_launch_interests(student_id);

ALTER TABLE course_launch_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own interest"
  ON course_launch_interests FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admin full access interests"
  ON course_launch_interests FOR ALL
  USING (is_admin_user());
