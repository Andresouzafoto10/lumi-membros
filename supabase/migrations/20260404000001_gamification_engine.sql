-- =============================================================================
-- GAMIFICATION ENGINE: points_config, points_log, levels, achievements, user_achievements
-- Adds current_level column to gamification table
-- Seeds default point actions and levels
-- =============================================================================

-- Add current_level to gamification if not exists
DO $$ BEGIN
  ALTER TABLE public.gamification ADD COLUMN current_level integer NOT NULL DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 1. POINTS CONFIG
CREATE TABLE IF NOT EXISTS public.points_config (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type  text UNIQUE NOT NULL,
  action_label text NOT NULL,
  points       integer NOT NULL DEFAULT 10,
  max_times    integer,
  is_system    boolean NOT NULL DEFAULT false,
  enabled      boolean NOT NULL DEFAULT true,
  category     text NOT NULL DEFAULT 'learning',
  description  text NOT NULL DEFAULT '',
  icon         text NOT NULL DEFAULT '⭐',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.points_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "points_config: todos lêem"
    ON public.points_config FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "points_config: admin gerencia"
    ON public.points_config FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner','admin','support')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default point actions
INSERT INTO public.points_config (action_type, action_label, points, max_times, is_system, enabled, category, description, icon) VALUES
  -- APRENDIZADO
  ('complete_lesson', 'Aula concluída',           10,  NULL, true, true, 'learning',    'Ao marcar uma aula como concluída',              '📚'),
  ('complete_course', 'Curso finalizado (100%)',   100, 1,    true, true, 'learning',    'Ao completar todas as aulas de um curso',         '🏆'),
  ('rate_lesson',     'Aula avaliada (curtida)',   5,   20,   true, true, 'learning',    'Ao dar thumbs up em uma aula',                   '👍'),
  ('lesson_notes',    'Anotação em aula',          3,   10,   true, true, 'learning',    'Ao salvar uma anotação em qualquer aula',         '📝'),
  ('earn_certificate','Certificado obtido',        50,  5,    true, true, 'learning',    'Ao emitir um certificado de conclusão',           '🎓'),
  -- COMUNIDADE
  ('create_post',     'Post publicado',            15,  5,    true, true, 'community',   'Ao publicar um novo post na comunidade',          '✍️'),
  ('comment',         'Comentário feito',          5,   20,   true, true, 'community',   'Ao comentar em um post',                          '💬'),
  ('like_post',       'Curtida recebida em post',  2,   NULL, true, true, 'community',   'Quando outro aluno curte seu post',               '❤️'),
  ('like_comment',    'Curtida em comentário',     1,   NULL, true, true, 'community',   'Quando outro aluno curte seu comentário',          '👏'),
  ('poll_answered',   'Enquete respondida',        5,   10,   true, true, 'community',   'Ao votar em uma enquete',                         '📊'),
  -- ENGAJAMENTO
  ('daily_login',     'Acesso diário',             2,   1,    true, true, 'engagement',  'Por acessar a plataforma uma vez por dia',        '📅'),
  ('profile_complete','Perfil completo',           20,  1,    true, true, 'engagement',  'Ao preencher avatar, bio, username e localização','✅'),
  ('first_post',      'Primeiro post',             25,  1,    true, true, 'engagement',  'Bônus único pelo primeiro post publicado',        '🌟'),
  ('streak_7days',    'Sequência de 7 dias',       50,  1,    true, true, 'engagement',  'Por acessar a plataforma 7 dias seguidos',        '🔥'),
  ('streak_30days',   'Sequência de 30 dias',      200, 1,    true, true, 'engagement',  'Por acessar a plataforma 30 dias seguidos',       '💎'),
  ('admin_manual',    'Ajuste manual (admin)',      0,   NULL, true, true, 'engagement',  'Pontos adicionados ou removidos manualmente',     '🛠️')
ON CONFLICT (action_type) DO NOTHING;

-- 2. POINTS LOG
CREATE TABLE IF NOT EXISTS public.points_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type  text NOT NULL,
  points       integer NOT NULL,
  reference_id text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_log_student_id_idx ON public.points_log(student_id);
CREATE INDEX IF NOT EXISTS points_log_action_type_idx ON public.points_log(action_type);
CREATE INDEX IF NOT EXISTS points_log_created_at_idx ON public.points_log(created_at);

ALTER TABLE public.points_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "points_log: aluno lê o próprio"
    ON public.points_log FOR SELECT
    USING (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "points_log: admin lê todos"
    ON public.points_log FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner','admin','support')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "points_log: sistema insere"
    ON public.points_log FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. LEVELS
CREATE TABLE IF NOT EXISTS public.levels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number     integer UNIQUE NOT NULL,
  name             text NOT NULL,
  points_required  integer NOT NULL DEFAULT 0,
  icon_type        text NOT NULL DEFAULT 'emoji',
  icon_name        text NOT NULL DEFAULT '🌱',
  icon_color       text NOT NULL DEFAULT '#94a3b8',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "levels: todos lêem"
    ON public.levels FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "levels: admin gerencia"
    ON public.levels FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner','admin','support')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default levels
INSERT INTO public.levels (level_number, name, points_required, icon_name, icon_color) VALUES
  (1, 'Iniciante',   0,     '🌱', '#94a3b8'),
  (2, 'Aprendiz',    50,    '⚡', '#3b82f6'),
  (3, 'Explorador',  150,   '🔥', '#f97316'),
  (4, 'Praticante',  400,   '⭐', '#eab308'),
  (5, 'Fotógrafo',   800,   '💎', '#8b5cf6'),
  (6, 'Artista',     1200,  '🎨', '#ef4444'),
  (7, 'Expert',      2000,  '👑', '#eab308'),
  (8, 'Mestre',      4000,  '🏆', '#f97316'),
  (9, 'Lenda',       10000, '🌟', '#00C2CB')
ON CONFLICT (level_number) DO NOTHING;

-- 4. ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.achievements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  description      text NOT NULL DEFAULT '',
  icon_emoji       text NOT NULL DEFAULT '🏆',
  badge_color      text NOT NULL DEFAULT '#00C2CB',
  points_required  integer NOT NULL DEFAULT 0,
  trigger_type     text NOT NULL DEFAULT 'points',
  trigger_value    integer NOT NULL DEFAULT 50,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "achievements: todos lêem"
    ON public.achievements FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "achievements: admin gerencia"
    ON public.achievements FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner','admin','support')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed default badges
INSERT INTO public.achievements (title, description, icon_emoji, badge_color, trigger_type, trigger_value, is_active) VALUES
  ('Primeiro Passo', 'Completou a primeira aula',             '🎯', '#3b82f6', 'lessons', 1,  true),
  ('Estudioso',      'Completou 10 aulas',                    '📚', '#10b981', 'lessons', 10, true),
  ('Maratonista',    'Completou 50 aulas',                    '🏃', '#f97316', 'lessons', 50, true),
  ('Engajado',       'Acumulou 100 pontos',                   '❤️', '#ef4444', 'points',  100, true),
  ('Destaque',       'Acumulou 500 pontos',                   '⭐', '#eab308', 'points',  500, true),
  ('Veterano',       'Acumulou 2000 pontos',                  '🏆', '#8b5cf6', 'points',  2000, true),
  ('Dedicado',       'Completou 3 cursos',                    '🎓', '#00C2CB', 'courses', 3,  true)
ON CONFLICT DO NOTHING;

-- 5. USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id  uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS user_achievements_student_idx ON public.user_achievements(student_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "user_achievements: aluno lê o próprio"
    ON public.user_achievements FOR SELECT
    USING (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_achievements: admin gerencia"
    ON public.user_achievements FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('owner','admin','support')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "user_achievements: sistema insere"
    ON public.user_achievements FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
