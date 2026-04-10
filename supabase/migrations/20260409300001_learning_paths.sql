-- ============================================================
-- Learning Paths (trilhas de aprendizado)
-- ============================================================

CREATE TABLE IF NOT EXISTS learning_paths (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  banner_url text,
  is_active boolean NOT NULL DEFAULT true,
  sequential boolean NOT NULL DEFAULT true,
  certificate_template_id uuid REFERENCES certificate_templates(id) ON DELETE SET NULL,
  certificate_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_learning_paths_updated
  BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Courses inside a path (with order)
CREATE TABLE IF NOT EXISTS learning_path_courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  UNIQUE(path_id, course_id)
);

CREATE INDEX idx_path_courses_path ON learning_path_courses(path_id, order_index);

-- Access grants (by class OR by individual student)
CREATE TABLE IF NOT EXISTS learning_path_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  expires_at timestamptz,
  granted_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (class_id IS NOT NULL OR student_id IS NOT NULL)
);

CREATE INDEX idx_path_access_path ON learning_path_access(path_id);
CREATE INDEX idx_path_access_class ON learning_path_access(class_id);
CREATE INDEX idx_path_access_student ON learning_path_access(student_id);

-- Path completion certificates
CREATE TABLE IF NOT EXISTS learning_path_certificates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_id uuid REFERENCES certificate_templates(id) ON DELETE SET NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  downloaded_at timestamptz,
  UNIQUE(path_id, student_id)
);

CREATE INDEX idx_path_certs_student ON learning_path_certificates(student_id);

-- RLS
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read paths"
  ON learning_paths FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read path courses"
  ON learning_path_courses FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can read own access"
  ON learning_path_access FOR SELECT
  USING (auth.uid() = student_id OR is_admin_user());

CREATE POLICY "Students can read own path certs"
  ON learning_path_certificates FOR SELECT
  USING (auth.uid() = student_id OR is_admin_user());

CREATE POLICY "Students can insert own path certs"
  ON learning_path_certificates FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Admin full paths" ON learning_paths FOR ALL USING (is_admin_user());
CREATE POLICY "Admin full path courses" ON learning_path_courses FOR ALL USING (is_admin_user());
CREATE POLICY "Admin full path access" ON learning_path_access FOR ALL USING (is_admin_user());
CREATE POLICY "Admin full path certs" ON learning_path_certificates FOR ALL USING (is_admin_user());
