-- Adds visibility_mode to course_sessions
-- 'all'              = visible to every logged-in student (default, backward compat)
-- 'enrolled_courses' = visible only to students enrolled in at least one course of the session
ALTER TABLE course_sessions
  ADD COLUMN IF NOT EXISTS visibility_mode text NOT NULL DEFAULT 'all'
  CHECK (visibility_mode IN ('all', 'enrolled_courses'));
