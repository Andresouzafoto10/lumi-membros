-- =============================================================================
-- EMAIL AUTOMATIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_automations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  delay_hours integer DEFAULT 0,
  subject_template text NOT NULL,
  preview_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS email_automations_updated_at ON public.email_automations;
CREATE TRIGGER email_automations_updated_at
  BEFORE UPDATE ON public.email_automations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email_automations" ON public.email_automations;
CREATE POLICY "Admins can manage email_automations" ON public.email_automations
  FOR ALL USING (public.is_admin_user());

DROP POLICY IF EXISTS "Anyone authenticated can read active automations" ON public.email_automations;
CREATE POLICY "Anyone authenticated can read active automations" ON public.email_automations
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================================
-- CREATE email_notification_log (if not exists) + EXPAND
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.email_notification_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id    text NOT NULL,
  type            text NOT NULL,
  sent_at         timestamptz DEFAULT now(),
  status          text DEFAULT 'sent',
  metadata        jsonb
);

CREATE INDEX IF NOT EXISTS email_notification_log_recipient_idx
  ON public.email_notification_log(recipient_id);
CREATE INDEX IF NOT EXISTS email_notification_log_type_idx
  ON public.email_notification_log(type);

ALTER TABLE public.email_notification_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'email_notification_log: admin pode tudo' AND tablename = 'email_notification_log') THEN
    CREATE POLICY "email_notification_log: admin pode tudo"
      ON public.email_notification_log FOR ALL
      USING (public.is_admin_user());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'email_notification_log: aluno le os proprios' AND tablename = 'email_notification_log') THEN
    CREATE POLICY "email_notification_log: aluno le os proprios"
      ON public.email_notification_log FOR SELECT
      USING (recipient_id = auth.uid()::text);
  END IF;
END $$;

ALTER TABLE public.email_notification_log
  ADD COLUMN IF NOT EXISTS automation_type text,
  ADD COLUMN IF NOT EXISTS subject text,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz;

-- =============================================================================
-- SEED DEFAULT AUTOMATIONS
-- =============================================================================
INSERT INTO public.email_automations (type, name, description, category, delay_hours, subject_template, preview_text)
VALUES
  ('welcome', 'Boas-vindas ao novo aluno', 'Enviado quando um novo usuário é cadastrado na plataforma', 'onboarding', 0, 'Bem-vindo(a) à {{platform_name}}! 🎉', 'Sua jornada começa agora'),
  ('access_reminder_7d', 'Lembrete de inatividade (7 dias)', 'Enviado uma vez se o aluno não acessar por 7 dias', 'engagement', 168, 'Sentimos sua falta, {{first_name}} 👋', 'Você tem cursos esperando por você'),
  ('community_post', 'Nova publicação na comunidade', 'Enviado quando aluno faz primeira publicação aprovada', 'community', 0, 'Sua publicação está no ar! 🚀', 'A comunidade já pode ver seu post'),
  ('community_inactive_30d', 'Inatividade na comunidade (30 dias)', 'Enviado se aluno não postar na comunidade por 30 dias', 'community', 0, 'Tem novidades na comunidade, {{first_name}}! 💬', 'Veja o que está acontecendo'),
  ('new_course', 'Novo curso disponível', 'Enviado para alunos elegíveis quando um novo curso é publicado', 'content', 0, 'Novo curso disponível: {{course_name}} 🎓', 'Acesse agora e comece a aprender'),
  ('new_lesson', 'Nova aula disponível', 'Enviado quando uma nova aula é adicionada a um curso que o aluno faz', 'content', 0, 'Nova aula em {{course_name}}: {{lesson_name}} ▶️', 'Assista agora'),
  ('certificate_earned', 'Certificado disponível', 'Enviado quando o aluno conquista um certificado', 'gamification', 0, 'Parabéns! Seu certificado está disponível 🏆', 'Você concluiu {{course_name}}'),
  ('mention_community', 'Menção na comunidade', 'Enviado quando aluno é mencionado em um post ou comentário', 'community', 0, '{{author_name}} mencionou você na comunidade 💬', 'Veja o que disseram'),
  ('follower_milestone_10', 'Marco de 10 seguidores', 'Enviado a cada 10 novos seguidores conquistados', 'engagement', 0, 'Você tem {{follower_count}} seguidores! 🌟', 'Sua audiência está crescendo'),
  ('post_reply', 'Resposta no seu post', 'Enviado quando alguém comenta no post do aluno', 'community', 0, '{{author_name}} respondeu seu post 💬', 'Veja o que acharam'),
  ('mission_complete', 'Missão concluída', 'Enviado quando aluno completa uma missão', 'gamification', 0, 'Missão concluída: {{mission_name}} ⚡', 'Você ganhou {{points}} pontos'),
  ('comment_milestone', 'Marco de comentários', 'Enviado a cada X comentários feitos (configurável)', 'gamification', 0, 'Você fez {{comment_count}} comentários! 🗣️', 'Continue engajando a comunidade')
ON CONFLICT (type) DO NOTHING;
