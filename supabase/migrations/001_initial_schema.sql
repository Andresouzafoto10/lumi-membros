-- =============================================================================
-- LUMI MEMBROS — Schema Inicial
-- Execute este arquivo no Supabase SQL Editor:
-- https://app.supabase.com → SQL Editor → New query → Cole e rode
-- =============================================================================

-- Extensão para UUIDs
create extension if not exists "pgcrypto";

-- =============================================================================
-- HELPER: updated_at automático
-- =============================================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 1. PROFILES (espelha auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null,
  name            text not null default '',
  role            text not null default 'student'
                    check (role in ('owner','admin','support','moderator','student')),
  status          text not null default 'active'
                    check (status in ('active','inactive','expired')),
  username        text unique default '',
  display_name    text not null default '',
  avatar_url      text not null default '',
  cover_url       text not null default '',
  cover_position  text not null default '50% 50%',
  bio             text not null default '',
  link            text not null default '',
  location        text not null default '',
  followers       uuid[] not null default '{}',
  following       uuid[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-criar profile quando novo usuário se registra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

-- Helper function for admin check (SECURITY DEFINER bypasses RLS to avoid infinite recursion)
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin', 'support')
  );
$$;

create policy "profiles: leitura pública"
  on public.profiles for select using (true);

create policy "profiles: usuário edita o próprio"
  on public.profiles for update
  using (auth.uid() = id);

-- NOTE: Uses is_admin_user() SECURITY DEFINER function to avoid infinite recursion
create policy "profiles: admin gerencia todos"
  on public.profiles for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- =============================================================================
-- 2. COURSE_SESSIONS
-- =============================================================================
create table if not exists public.course_sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  is_active   boolean not null default true,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger course_sessions_updated_at
  before update on public.course_sessions
  for each row execute function public.handle_updated_at();

alter table public.course_sessions enable row level security;

create policy "course_sessions: alunos lêem sessões ativas"
  on public.course_sessions for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

create policy "course_sessions: admin gerencia"
  on public.course_sessions for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 3. COURSES
-- =============================================================================
create table if not exists public.courses (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.course_sessions(id) on delete cascade,
  title               text not null,
  description         text not null default '',
  banner_url          text not null default '',
  "order"             integer not null default 0,
  is_active           boolean not null default true,
  access              jsonb not null default '{"mode":"all"}'::jsonb,
  certificate_config  jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index courses_session_id_idx on public.courses(session_id);

create trigger courses_updated_at
  before update on public.courses
  for each row execute function public.handle_updated_at();

alter table public.courses enable row level security;

create policy "courses: alunos lêem cursos ativos"
  on public.courses for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

create policy "courses: admin gerencia"
  on public.courses for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 4. COURSE_MODULES
-- =============================================================================
create table if not exists public.course_modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  "order"     integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index course_modules_course_id_idx on public.course_modules(course_id);

create trigger course_modules_updated_at
  before update on public.course_modules
  for each row execute function public.handle_updated_at();

alter table public.course_modules enable row level security;

create policy "course_modules: alunos lêem módulos ativos"
  on public.course_modules for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

create policy "course_modules: admin gerencia"
  on public.course_modules for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 5. COURSE_LESSONS
-- =============================================================================
create table if not exists public.course_lessons (
  id                        uuid primary key default gen_random_uuid(),
  module_id                 uuid not null references public.course_modules(id) on delete cascade,
  title                     text not null,
  "order"                   integer not null default 0,
  is_active                 boolean not null default true,
  video_type                text not null default 'none'
                              check (video_type in ('youtube','vimeo','embed','none')),
  video_url                 text,
  description               text not null default '',
  materials                 jsonb,
  quiz                      jsonb,
  quiz_passing_score        integer,
  quiz_required_to_advance  boolean not null default false,
  ratings_enabled           boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index course_lessons_module_id_idx on public.course_lessons(module_id);

create trigger course_lessons_updated_at
  before update on public.course_lessons
  for each row execute function public.handle_updated_at();

alter table public.course_lessons enable row level security;

create policy "course_lessons: alunos lêem aulas ativas"
  on public.course_lessons for select
  using (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

create policy "course_lessons: admin gerencia"
  on public.course_lessons for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 6. COURSE_BANNERS
-- =============================================================================
create table if not exists public.course_banners (
  id                uuid primary key default gen_random_uuid(),
  title             text,
  subtitle          text,
  button_label      text,
  target_type       text not null default 'none'
                      check (target_type in ('none','course','url')),
  target_course_id  uuid references public.courses(id) on delete set null,
  target_url        text,
  image_url         text not null,
  is_active         boolean not null default true,
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger course_banners_updated_at
  before update on public.course_banners
  for each row execute function public.handle_updated_at();

alter table public.course_banners enable row level security;

create policy "course_banners: todos os autenticados lêem banners ativos"
  on public.course_banners for select
  using (auth.uid() is not null and (is_active = true or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  )));

create policy "course_banners: admin gerencia"
  on public.course_banners for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 7. CLASSES (TURMAS)
-- =============================================================================
create table if not exists public.classes (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  course_ids            uuid[] not null default '{}',
  enrollment_type       text not null default 'individual'
                          check (enrollment_type in ('individual','subscription','unlimited')),
  access_duration_days  integer,
  status                text not null default 'active'
                          check (status in ('active','inactive')),
  content_schedule      jsonb not null default '[]'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger classes_updated_at
  before update on public.classes
  for each row execute function public.handle_updated_at();

alter table public.classes enable row level security;

create policy "classes: admin gerencia"
  on public.classes for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- NOTE: "classes: alunos lêem suas turmas" is added AFTER enrollments table (below)

-- =============================================================================
-- 8. ENROLLMENTS
-- =============================================================================
create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  class_id     uuid not null references public.classes(id) on delete cascade,
  type         text not null default 'individual'
                 check (type in ('individual','subscription','unlimited')),
  expires_at   timestamptz,
  status       text not null default 'active'
                 check (status in ('active','expired','cancelled')),
  enrolled_at  timestamptz not null default now(),
  unique (student_id, class_id)
);

create index enrollments_student_id_idx on public.enrollments(student_id);
create index enrollments_class_id_idx on public.enrollments(class_id);

alter table public.enrollments enable row level security;

create policy "enrollments: aluno lê próprias matrículas"
  on public.enrollments for select
  using (student_id = auth.uid());

create policy "enrollments: admin gerencia todas"
  on public.enrollments for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- Policy de classes que depende de enrollments (adicionada aqui após a criação de enrollments)
create policy "classes: alunos lêem suas turmas"
  on public.classes for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.class_id = id and e.student_id = auth.uid() and e.status = 'active'
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner','admin','support')
    )
  );

-- =============================================================================
-- 9. COMMUNITIES
-- =============================================================================
create table if not exists public.communities (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  description      text not null default '',
  cover_url        text not null default '',
  icon_url         text not null default '',
  class_ids        uuid[] not null default '{}',
  pinned_post_id   uuid,
  settings         jsonb not null default '{"allowStudentPosts":true,"requireApproval":false,"allowImages":true}'::jsonb,
  status           text not null default 'active'
                     check (status in ('active','inactive')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger communities_updated_at
  before update on public.communities
  for each row execute function public.handle_updated_at();

alter table public.communities enable row level security;

create policy "communities: todos autenticados lêem ativas"
  on public.communities for select
  using (auth.uid() is not null and (status = 'active' or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support','moderator')
  )));

create policy "communities: admin gerencia"
  on public.communities for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 10. COMMUNITY_POSTS
-- =============================================================================
create table if not exists public.community_posts (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references public.communities(id) on delete cascade,
  author_id       uuid not null references public.profiles(id) on delete cascade,
  type            text not null default 'user'
                    check (type in ('user','system')),
  system_event    jsonb,
  title           text not null default '',
  body            text not null default '',
  images          text[] not null default '{}',
  attachments     jsonb not null default '[]'::jsonb,
  poll            jsonb,
  hashtags        text[] not null default '{}',
  mentions        uuid[] not null default '{}',
  likes_count     integer not null default 0,
  comments_count  integer not null default 0,
  liked_by        uuid[] not null default '{}',
  saved_by        uuid[] not null default '{}',
  status          text not null default 'published'
                    check (status in ('published','pending','rejected')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index community_posts_community_id_idx on public.community_posts(community_id);
create index community_posts_author_id_idx on public.community_posts(author_id);
create index community_posts_created_at_idx on public.community_posts(created_at desc);

create trigger community_posts_updated_at
  before update on public.community_posts
  for each row execute function public.handle_updated_at();

alter table public.community_posts enable row level security;

create policy "community_posts: autenticados lêem posts publicados"
  on public.community_posts for select
  using (
    auth.uid() is not null and (
      status = 'published'
      or author_id = auth.uid()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role in ('owner','admin','support','moderator')
      )
    )
  );

create policy "community_posts: aluno cria"
  on public.community_posts for insert
  with check (auth.uid() = author_id);

create policy "community_posts: autor edita o próprio"
  on public.community_posts for update
  using (author_id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support','moderator')
  ));

create policy "community_posts: autor ou moderador exclui"
  on public.community_posts for delete
  using (author_id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support','moderator')
  ));

-- =============================================================================
-- 11. POST_COMMENTS
-- =============================================================================
create table if not exists public.post_comments (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references public.community_posts(id) on delete cascade,
  author_id          uuid not null references public.profiles(id) on delete cascade,
  body               text not null,
  likes_count        integer not null default 0,
  liked_by           uuid[] not null default '{}',
  parent_comment_id  uuid references public.post_comments(id) on delete cascade,
  created_at         timestamptz not null default now()
);

create index post_comments_post_id_idx on public.post_comments(post_id);

alter table public.post_comments enable row level security;

create policy "post_comments: autenticados lêem"
  on public.post_comments for select
  using (auth.uid() is not null);

create policy "post_comments: aluno cria"
  on public.post_comments for insert
  with check (auth.uid() = author_id);

create policy "post_comments: autor ou moderador edita"
  on public.post_comments for update
  using (author_id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support','moderator')
  ));

create policy "post_comments: autor ou moderador exclui"
  on public.post_comments for delete
  using (author_id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support','moderator')
  ));

-- =============================================================================
-- 12. NOTIFICATIONS
-- =============================================================================
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  type          text not null
                  check (type in ('like','comment','follow','mention','system')),
  actor_id      uuid references public.profiles(id) on delete set null,
  target_id     uuid not null,
  target_type   text not null
                  check (target_type in ('post','comment','profile')),
  message       text not null,
  read          boolean not null default false,
  created_at    timestamptz not null default now()
);

create index notifications_recipient_id_idx on public.notifications(recipient_id);

alter table public.notifications enable row level security;

create policy "notifications: usuário lê as próprias"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "notifications: sistema cria"
  on public.notifications for insert
  with check (auth.uid() is not null);

create policy "notifications: usuário marca como lida"
  on public.notifications for update
  using (recipient_id = auth.uid());

-- =============================================================================
-- 13. GAMIFICATION
-- =============================================================================
create table if not exists public.gamification (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid unique not null references public.profiles(id) on delete cascade,
  points        integer not null default 0,
  current_level integer not null default 1,
  badges        text[] not null default '{}',
  updated_at    timestamptz not null default now()
);

create trigger gamification_updated_at
  before update on public.gamification
  for each row execute function public.handle_updated_at();

alter table public.gamification enable row level security;

create policy "gamification: todos lêem"
  on public.gamification for select
  using (auth.uid() is not null);

create policy "gamification: admin atualiza"
  on public.gamification for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- 13b. POINTS CONFIG (configurable point actions)
create table if not exists public.points_config (
  id           uuid primary key default gen_random_uuid(),
  action_type  text unique not null,
  action_label text not null,
  points       integer not null default 10,
  max_times    integer,
  is_system    boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.points_config enable row level security;

create policy "points_config: todos lêem"
  on public.points_config for select
  using (auth.uid() is not null);

create policy "points_config: admin gerencia"
  on public.points_config for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- Seed default point actions
insert into public.points_config (action_type, action_label, points, max_times, is_system) values
  ('complete_lesson', 'Aula concluída', 10, null, true),
  ('complete_course', 'Curso finalizado (100%)', 100, 1, true),
  ('rate_lesson', 'Aula avaliada (curtida)', 5, 20, true),
  ('lesson_notes', 'Anotação em aula', 3, 10, true),
  ('create_post', 'Post publicado', 15, 5, true),
  ('comment', 'Comentário feito', 5, 20, true),
  ('like_post', 'Curtida recebida em post', 2, null, true),
  ('like_comment', 'Curtida recebida em comentário', 1, null, true),
  ('poll_answered', 'Enquete respondida', 5, 10, true),
  ('daily_login', 'Acesso diário', 2, 1, true),
  ('profile_complete', 'Perfil completo', 20, 1, true),
  ('first_post', 'Primeiro post', 25, 1, true),
  ('earn_certificate', 'Certificado conquistado', 50, null, true)
on conflict (action_type) do nothing;

-- 13c. POINTS LOG (transaction history)
create table if not exists public.points_log (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  action_type  text not null,
  points       integer not null,
  reference_id text,
  created_at   timestamptz not null default now()
);

create index points_log_student_id_idx on public.points_log(student_id);
create index points_log_action_type_idx on public.points_log(action_type);

alter table public.points_log enable row level security;

create policy "points_log: aluno lê o próprio"
  on public.points_log for select
  using (student_id = auth.uid());

create policy "points_log: admin lê todos"
  on public.points_log for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

create policy "points_log: sistema insere"
  on public.points_log for insert
  with check (auth.uid() is not null);

-- 13d. LEVELS (configurable level tiers)
create table if not exists public.levels (
  id               uuid primary key default gen_random_uuid(),
  level_number     integer unique not null,
  name             text not null,
  points_required  integer not null default 0,
  icon_type        text not null default 'emoji',
  icon_name        text not null default '🌱',
  icon_color       text not null default '#94a3b8',
  created_at       timestamptz not null default now()
);

alter table public.levels enable row level security;

create policy "levels: todos lêem"
  on public.levels for select
  using (auth.uid() is not null);

create policy "levels: admin gerencia"
  on public.levels for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- Seed default levels
insert into public.levels (level_number, name, points_required, icon_name, icon_color) values
  (1, 'Iniciante',   0,     '🌱', '#94a3b8'),
  (2, 'Aprendiz',    50,    '⚡', '#3b82f6'),
  (3, 'Explorador',  150,   '🔥', '#f97316'),
  (4, 'Praticante',  400,   '⭐', '#eab308'),
  (5, 'Fotógrafo',   800,   '💎', '#8b5cf6'),
  (6, 'Artista',     1200,  '🎨', '#ef4444'),
  (7, 'Expert',      2000,  '👑', '#eab308'),
  (8, 'Mestre',      4000,  '🏆', '#f97316'),
  (9, 'Lenda',       10000, '🌟', '#00C2CB')
on conflict (level_number) do nothing;

-- 13e. MISSIONS (sistema unificado de missões — substitui achievements/badges)
create table if not exists public.missions (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text not null default '',
  icon                text not null default '🎯',
  condition_type      text not null default 'action_count',
  condition_action    text,
  condition_threshold integer not null default 1,
  points_reward       integer not null default 0,
  enabled             boolean not null default true,
  is_secret           boolean not null default false,
  is_default          boolean not null default false,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now()
);

alter table public.missions enable row level security;

create policy "missions: todos lêem"
  on public.missions for select
  using (auth.uid() is not null);

create policy "missions: admin gerencia"
  on public.missions for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- 13f. STUDENT_MISSIONS (missões conquistadas/em progresso por aluno)
create table if not exists public.student_missions (
  id              uuid primary key default gen_random_uuid(),
  mission_id      uuid not null references public.missions(id) on delete cascade,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  progress        integer not null default 0,
  completed       boolean not null default false,
  completed_at    timestamptz,
  granted_by      text not null default 'system',
  created_at      timestamptz not null default now(),
  unique(mission_id, student_id)
);

create index student_missions_student_idx on public.student_missions(student_id);

alter table public.student_missions enable row level security;

create policy "student_missions: aluno lê o próprio"
  on public.student_missions for select
  using (student_id = auth.uid());

create policy "student_missions: admin gerencia"
  on public.student_missions for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

create policy "student_missions: sistema insere/atualiza"
  on public.student_missions for insert
  with check (auth.uid() is not null);

-- Missões padrão
insert into public.missions
  (name, description, icon, condition_type, condition_action, condition_threshold, points_reward, is_default, sort_order)
values
  -- APRENDIZADO
  ('Primeiro Passo',   'Concluiu a primeira aula',              '🎯', 'lesson_complete',  'complete_lesson', 1,   10,  true, 1),
  ('Estudioso',        'Concluiu 10 aulas',                     '📚', 'lesson_complete',  'complete_lesson', 10,  25,  true, 2),
  ('Maratonista',      'Concluiu 50 aulas',                     '🏃', 'lesson_complete',  'complete_lesson', 50,  100, true, 3),
  ('Dedicado',         'Completou 3 cursos inteiros',           '🎓', 'course_complete',  'complete_course', 3,   150, true, 4),
  ('Mestre do Curso',  'Completou 10 cursos inteiros',          '👑', 'course_complete',  'complete_course', 10,  500, true, 5),
  -- COMUNIDADE
  ('Quebra-gelo',      'Publicou o primeiro post',              '✍️', 'action_count',     'create_post',     1,   25,  true, 6),
  ('Influencer',       'Publicou 20 posts na comunidade',       '📣', 'action_count',     'create_post',     20,  75,  true, 7),
  ('Comentarista',     'Fez 10 comentários',                    '💬', 'action_count',     'comment',         10,  30,  true, 8),
  ('Voz Ativa',        'Fez 50 comentários',                    '🗣️', 'action_count',     'comment',         50,  100, true, 9),
  ('Engajado',         'Curtiu 10 posts na comunidade',         '❤️', 'action_count',     'like_post',       10,  20,  true, 10),
  ('Popular',          'Recebeu 20 curtidas nos seus posts',    '⭐', 'action_count',     'post_liked',      20,  50,  true, 11),
  ('Celebridade',      'Recebeu 100 curtidas nos seus posts',   '🌟', 'action_count',     'post_liked',      100, 200, true, 12),
  -- ENGAJAMENTO
  ('Frequente',        'Acessou a plataforma 7 dias seguidos',  '🔥', 'streak_days',      null,              7,   50,  true, 13),
  ('Consistente',      'Acessou a plataforma 30 dias seguidos', '💎', 'streak_days',      null,              30,  200, true, 14),
  ('Destaque',         'Acumulou 500 pontos',                   '🏅', 'points_total',     null,              500, 0,   true, 15),
  ('Veterano',         'Acumulou 2000 pontos',                  '🏆', 'points_total',     null,              2000,0,   true, 16);

-- =============================================================================
-- 14. RESTRICTIONS
-- =============================================================================
create table if not exists public.restrictions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  applied_by  uuid not null references public.profiles(id),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  active      boolean not null default true
);

create index restrictions_student_id_idx on public.restrictions(student_id);

alter table public.restrictions enable row level security;

create policy "restrictions: moderador gerencia"
  on public.restrictions for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support','moderator')
  ));

create policy "restrictions: aluno lê a própria"
  on public.restrictions for select
  using (student_id = auth.uid());

-- =============================================================================
-- 15. PLATFORM_SETTINGS (linha única: id = 'default')
-- =============================================================================
create table if not exists public.platform_settings (
  id                          text primary key default 'default',
  name                        text not null default 'Lumi Membros',
  logo_url                    text not null default '',
  default_theme               text not null default 'dark',
  ratings_enabled             boolean not null default true,
  certificate_background_url  text not null default '',
  certificate_default_text    text not null default '',
  theme                       jsonb not null default '{}'::jsonb,
  updated_at                  timestamptz not null default now()
);

-- Inserir registro padrão
insert into public.platform_settings (id) values ('default') on conflict do nothing;

create trigger platform_settings_updated_at
  before update on public.platform_settings
  for each row execute function public.handle_updated_at();

alter table public.platform_settings enable row level security;

create policy "platform_settings: todos autenticados lêem"
  on public.platform_settings for select
  using (auth.uid() is not null);

create policy "platform_settings: owner atualiza"
  on public.platform_settings for update
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin')
  ));

-- =============================================================================
-- 16. ACCESS_PROFILES
-- =============================================================================
create table if not exists public.access_profiles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text not null default '',
  permissions  jsonb not null default '{"courses":false,"students":false,"classes":false,"settings":false,"community":false}'::jsonb,
  created_at   timestamptz not null default now()
);

alter table public.access_profiles enable row level security;

create policy "access_profiles: admin lê e gerencia"
  on public.access_profiles for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin')
  ));

-- =============================================================================
-- 17. SIDEBAR_CONFIG
-- =============================================================================
create table if not exists public.sidebar_config (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references public.communities(id) on delete cascade,
  emoji           text not null default '📚',
  "order"         integer not null default 0,
  visible         boolean not null default true,
  sales_page_url  text not null default ''
);

create index sidebar_config_community_id_idx on public.sidebar_config(community_id);

alter table public.sidebar_config enable row level security;

create policy "sidebar_config: todos autenticados lêem"
  on public.sidebar_config for select
  using (auth.uid() is not null);

create policy "sidebar_config: admin gerencia"
  on public.sidebar_config for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 18. LESSON_RATINGS
-- =============================================================================
create table if not exists public.lesson_ratings (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.course_lessons(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  rating      text not null check (rating in ('like','dislike')),
  created_at  timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create index lesson_ratings_lesson_id_idx on public.lesson_ratings(lesson_id);

alter table public.lesson_ratings enable row level security;

create policy "lesson_ratings: aluno lê e gerencia a própria"
  on public.lesson_ratings for all
  using (student_id = auth.uid());

create policy "lesson_ratings: admin lê todas"
  on public.lesson_ratings for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 19. LESSON_NOTES
-- =============================================================================
create table if not exists public.lesson_notes (
  id          uuid primary key default gen_random_uuid(),
  lesson_id   uuid not null references public.course_lessons(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  content     text not null default '',
  updated_at  timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create trigger lesson_notes_updated_at
  before update on public.lesson_notes
  for each row execute function public.handle_updated_at();

alter table public.lesson_notes enable row level security;

create policy "lesson_notes: aluno gerencia as próprias"
  on public.lesson_notes for all
  using (student_id = auth.uid());

-- =============================================================================
-- 20. CERTIFICATE_TEMPLATES
-- =============================================================================
create table if not exists public.certificate_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  background_url    text not null default '',
  background_config jsonb not null default '{"fit":"cover","position":"50% 50%"}'::jsonb,
  blocks            jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger certificate_templates_updated_at
  before update on public.certificate_templates
  for each row execute function public.handle_updated_at();

alter table public.certificate_templates enable row level security;

create policy "certificate_templates: todos autenticados lêem"
  on public.certificate_templates for select
  using (auth.uid() is not null);

create policy "certificate_templates: admin gerencia"
  on public.certificate_templates for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin')
  ));

-- =============================================================================
-- 21. EARNED_CERTIFICATES
-- =============================================================================
create table if not exists public.earned_certificates (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles(id) on delete cascade,
  course_id      uuid not null references public.courses(id) on delete cascade,
  template_id    uuid not null references public.certificate_templates(id) on delete cascade,
  earned_at      timestamptz not null default now(),
  downloaded_at  timestamptz,
  unique (student_id, course_id)
);

create index earned_certificates_student_id_idx on public.earned_certificates(student_id);

alter table public.earned_certificates enable row level security;

create policy "earned_certificates: aluno lê os próprios"
  on public.earned_certificates for select
  using (student_id = auth.uid());

create policy "earned_certificates: admin gerencia"
  on public.earned_certificates for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 22. QUIZ_ATTEMPTS
-- =============================================================================
create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  lesson_id     uuid not null references public.course_lessons(id) on delete cascade,
  answers       jsonb not null default '{}'::jsonb,
  score         integer not null default 0,
  passed        boolean not null default false,
  attempted_at  timestamptz not null default now()
);

create index quiz_attempts_student_lesson_idx on public.quiz_attempts(student_id, lesson_id);

alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts: aluno gerencia os próprios"
  on public.quiz_attempts for all
  using (student_id = auth.uid());

create policy "quiz_attempts: admin lê todos"
  on public.quiz_attempts for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- =============================================================================
-- 23. LAST_WATCHED
-- =============================================================================
create table if not exists public.last_watched (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  course_title text not null default '',
  lesson_id    uuid not null references public.course_lessons(id) on delete cascade,
  lesson_title text not null default '',
  updated_at   timestamptz not null default now(),
  unique (student_id)
);

create trigger last_watched_updated_at
  before update on public.last_watched
  for each row execute function public.handle_updated_at();

alter table public.last_watched enable row level security;

create policy "last_watched: aluno gerencia o próprio"
  on public.last_watched for all
  using (student_id = auth.uid());

-- =============================================================================
-- 24. LESSON_PROGRESS
-- =============================================================================
create table if not exists public.lesson_progress (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.profiles(id) on delete cascade,
  lesson_id             uuid not null references public.course_lessons(id) on delete cascade,
  course_id             uuid not null references public.courses(id) on delete cascade,
  module_id             uuid not null references public.course_modules(id) on delete cascade,
  completed             boolean not null default false,
  watch_time_seconds    integer not null default 0,
  last_position_seconds integer not null default 0,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create index lesson_progress_student_id_idx on public.lesson_progress(student_id);
create index lesson_progress_course_id_idx on public.lesson_progress(course_id);

create trigger lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function public.handle_updated_at();

alter table public.lesson_progress enable row level security;

create policy "lesson_progress: aluno gerencia o proprio"
  on public.lesson_progress for all
  using (student_id = auth.uid());

create policy "lesson_progress: admin le todos"
  on public.lesson_progress for select
  using (public.is_admin_user());

-- =============================================================================
-- 23. EMAIL NOTIFICATION LOG
-- =============================================================================

create table if not exists public.email_notification_log (
  id              uuid default gen_random_uuid() primary key,
  recipient_id    text not null,
  type            text not null,
  sent_at         timestamptz default now(),
  status          text default 'sent',
  metadata        jsonb
);

create index email_notification_log_recipient_idx
  on public.email_notification_log(recipient_id);
create index email_notification_log_type_idx
  on public.email_notification_log(type);

alter table public.email_notification_log enable row level security;

create policy "email_notification_log: admin pode tudo"
  on public.email_notification_log for all
  using (public.is_admin_user());

create policy "email_notification_log: aluno le os proprios"
  on public.email_notification_log for select
  using (recipient_id = auth.uid()::text);

-- =============================================================================
-- 24. ADD email_notifications TO PROFILES
-- =============================================================================

alter table public.profiles
  add column if not exists email_notifications boolean not null default true;

-- =============================================================================
-- 25. ADD email_notifications_enabled TO PLATFORM_SETTINGS
-- =============================================================================

alter table public.platform_settings
  add column if not exists email_notifications_enabled boolean not null default true;

-- =============================================================================
-- 25b. ADD favicon, logo_upload, PWA fields TO PLATFORM_SETTINGS
-- =============================================================================

alter table public.platform_settings
  add column if not exists favicon_url text,
  add column if not exists logo_upload_url text,
  add column if not exists pwa_enabled boolean default false,
  add column if not exists pwa_name text,
  add column if not exists pwa_short_name text,
  add column if not exists pwa_icon_url text,
  add column if not exists pwa_theme_color text,
  add column if not exists pwa_background_color text;

-- =============================================================================
-- 25c. ADD login_cover_url TO PLATFORM_SETTINGS
-- =============================================================================

alter table public.platform_settings
  add column if not exists login_cover_url text;

-- =============================================================================
-- 26. ADD cpf TO PROFILES (para DRM Social)
-- =============================================================================

alter table public.profiles
  add column if not exists cpf text not null default '',
  add column if not exists social_instagram text,
  add column if not exists social_youtube text,
  add column if not exists social_tiktok text,
  add column if not exists social_twitter text,
  add column if not exists social_linkedin text,
  add column if not exists social_website text;

-- =============================================================================
-- 27. LESSON_MATERIALS
-- =============================================================================
create table if not exists public.lesson_materials (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.course_lessons(id) on delete cascade,
  title           text not null,
  file_path       text not null,
  file_type       text not null default 'other'
                    check (file_type in ('pdf','zip','mp3','image','other')),
  file_size_bytes bigint,
  drm_enabled     boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_lesson_materials_lesson_id on public.lesson_materials(lesson_id);

create trigger lesson_materials_updated_at
  before update on public.lesson_materials
  for each row execute function public.handle_updated_at();

alter table public.lesson_materials enable row level security;

-- Admin gerencia todos os materiais
create policy "lesson_materials: admin gerencia"
  on public.lesson_materials for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','admin','support')
  ));

-- Aluno lê materiais de aulas cujo curso pertence a uma turma em que está matriculado
create policy "lesson_materials: aluno lê via matrícula"
  on public.lesson_materials for select
  using (
    exists (
      select 1
      from public.course_lessons cl
      join public.course_modules cm on cm.id = cl.module_id
      join public.courses c on c.id = cm.course_id
      join public.classes cls on c.id = any(cls.course_ids)
      join public.enrollments e on e.class_id = cls.id
      where cl.id = lesson_materials.lesson_id
        and e.student_id = auth.uid()
        and e.status = 'active'
    )
  );

-- =============================================================================
-- 28. STORAGE BUCKET: lesson-materials (privado)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('lesson-materials', 'lesson-materials', false)
on conflict (id) do nothing;

-- Admins fazem upload
create policy "lesson_materials_storage: admin upload"
  on storage.objects for insert
  with check (
    bucket_id = 'lesson-materials'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner','admin','support')
    )
  );

-- Admins deletam
create policy "lesson_materials_storage: admin delete"
  on storage.objects for delete
  using (
    bucket_id = 'lesson-materials'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner','admin','support')
    )
  );

-- Service role lê (para Edge Function download-material)
-- Alunos NUNCA acessam o bucket diretamente — download sempre via Edge Function

-- =============================================================================
-- 29. EMAIL AUTOMATIONS
-- =============================================================================
create table if not exists public.email_automations (
  id              uuid default gen_random_uuid() primary key,
  type            text not null unique,
  name            text not null,
  description     text,
  category        text not null,
  is_active       boolean default true,
  delay_hours     integer default 0,
  subject_template text not null,
  preview_text    text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger email_automations_updated_at
  before update on public.email_automations
  for each row execute function public.handle_updated_at();

alter table public.email_automations enable row level security;

create policy "email_automations: admin pode tudo"
  on public.email_automations for all
  using (public.is_admin_user());

create policy "email_automations: autenticado le ativas"
  on public.email_automations for select
  using (auth.uid() is not null);

-- Expand email_notification_log
alter table public.email_notification_log
  add column if not exists automation_type text,
  add column if not exists subject text,
  add column if not exists opened_at timestamptz,
  add column if not exists clicked_at timestamptz;

-- Seed default automations
insert into public.email_automations (type, name, description, category, delay_hours, subject_template, preview_text)
values
  ('welcome', 'Boas-vindas ao novo aluno', 'Enviado quando um novo usuario e cadastrado', 'onboarding', 0, 'Bem-vindo(a) a {{platform_name}}!', 'Sua jornada comeca agora'),
  ('access_reminder_7d', 'Lembrete de inatividade (7 dias)', 'Enviado se o aluno nao acessar por 7 dias', 'engagement', 168, 'Sentimos sua falta, {{first_name}}', 'Voce tem cursos esperando'),
  ('community_post', 'Nova publicacao na comunidade', 'Enviado quando post aprovado', 'community', 0, 'Sua publicacao esta no ar!', 'A comunidade ja pode ver'),
  ('community_inactive_30d', 'Inatividade na comunidade (30 dias)', 'Enviado se aluno nao postar por 30 dias', 'community', 0, 'Tem novidades na comunidade!', 'Veja o que esta acontecendo'),
  ('new_course', 'Novo curso disponivel', 'Enviado quando novo curso e publicado', 'content', 0, 'Novo curso: {{course_name}}', 'Acesse agora'),
  ('new_lesson', 'Nova aula disponivel', 'Enviado quando nova aula e adicionada', 'content', 0, 'Nova aula em {{course_name}}', 'Assista agora'),
  ('certificate_earned', 'Certificado disponivel', 'Enviado quando aluno conquista certificado', 'gamification', 0, 'Parabens! Certificado disponivel', 'Voce concluiu {{course_name}}'),
  ('mention_community', 'Mencao na comunidade', 'Enviado quando mencionado', 'community', 0, '{{author_name}} te mencionou', 'Veja o que disseram'),
  ('follower_milestone_10', 'Marco de 10 seguidores', 'Enviado a cada 10 seguidores', 'engagement', 0, 'Voce tem {{follower_count}} seguidores!', 'Audiencia crescendo'),
  ('post_reply', 'Resposta no post', 'Enviado quando alguem comenta no post', 'community', 0, '{{author_name}} respondeu seu post', 'Veja o que acharam'),
  ('mission_complete', 'Missao concluida', 'Enviado quando missao completada', 'gamification', 0, 'Missao concluida: {{mission_name}}', 'Voce ganhou pontos'),
  ('comment_milestone', 'Marco de comentarios', 'Enviado a cada X comentarios', 'gamification', 0, 'Voce fez {{comment_count}} comentarios!', 'Continue engajando')
on conflict (type) do nothing;

-- =============================================================================
-- 30. NOTIFICATION PREFERENCES
-- =============================================================================
create table if not exists public.notification_preferences (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references public.profiles(id) on delete cascade not null,
  email_comments  boolean default true,
  email_comment_replies boolean default true,
  email_mentions  boolean default true,
  email_likes     boolean default false,
  email_follows   boolean default true,
  email_new_course boolean default true,
  email_new_lesson boolean default true,
  email_certificate boolean default true,
  email_mission_complete boolean default true,
  email_badge_earned boolean default true,
  email_post_reply boolean default true,
  email_follower_milestone boolean default true,
  email_weekly_digest boolean default true,
  email_marketing boolean default false,
  notif_comments  boolean default true,
  notif_comment_replies boolean default true,
  notif_mentions  boolean default true,
  notif_likes     boolean default true,
  notif_follows   boolean default true,
  notif_new_course boolean default true,
  notif_new_lesson boolean default true,
  notif_certificate boolean default true,
  notif_mission_complete boolean default true,
  notif_badge_earned boolean default true,
  notif_post_reply boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);

create trigger handle_updated_at_notification_preferences
  before update on public.notification_preferences
  for each row execute function public.handle_updated_at();

alter table public.notification_preferences enable row level security;

create policy "notif_prefs: aluno gerencia as proprias"
  on public.notification_preferences for all
  using (auth.uid() = user_id);

create policy "notif_prefs: admin gerencia todas"
  on public.notification_preferences for all
  using (public.is_admin_user());

-- Auto-criar preferencias para novos usuarios
create or replace function public.handle_new_user_preferences()
returns trigger as $$
begin
  insert into public.notification_preferences (user_id) values (NEW.id) on conflict do nothing;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_profile_created_create_preferences
  after insert on public.profiles
  for each row execute function public.handle_new_user_preferences();

-- =============================================================================
-- 31. NOTIFICATIONS: DELETE policies + cleanup
-- =============================================================================

-- Allow users to delete their own notifications
create policy "notifications: aluno deleta as proprias"
  on public.notifications for delete
  using (recipient_id = auth.uid());

-- Enforce 50 notification limit per user
create or replace function public.enforce_notification_limit()
returns trigger as $$
begin
  delete from public.notifications
  where id in (
    select id from public.notifications
    where recipient_id = NEW.recipient_id
    order by created_at desc
    offset 50
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger enforce_notification_limit_trigger
  after insert on public.notifications
  for each row execute function public.enforce_notification_limit();

-- Cleanup old read notifications (30+ days)
create or replace function public.cleanup_old_notifications()
returns integer as $$
declare deleted_count integer;
begin
  delete from public.notifications where read = true and created_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- 32. SCRIPT_INJECTIONS
-- =============================================================================
create table if not exists public.script_injections (
  id              uuid default gen_random_uuid() primary key,
  name            text not null,
  description     text,
  position        text not null check (position in ('head', 'body_start', 'body_end')),
  content         text not null,
  enabled         boolean default true,
  apply_to        text not null default 'all'
                    check (apply_to in ('all', 'admin_only', 'student_only', 'specific_pages')),
  specific_pages  text[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger script_injections_updated_at
  before update on public.script_injections
  for each row execute function public.handle_updated_at();

alter table public.script_injections enable row level security;

create policy "Admin full access script_injections"
  on public.script_injections for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- =============================================================================
-- 33. NAV_MENU_ITEMS
-- =============================================================================
create table if not exists public.nav_menu_items (
  id            uuid default gen_random_uuid() primary key,
  label         text not null,
  url           text,
  icon          text,
  target        text default '_self' check (target in ('_self', '_blank')),
  area          text not null default 'student'
                  check (area in ('student', 'admin')),
  is_external   boolean default false,
  is_default    boolean default false,
  visible       boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create trigger nav_menu_items_updated_at
  before update on public.nav_menu_items
  for each row execute function public.handle_updated_at();

alter table public.nav_menu_items enable row level security;

create policy "Admin full access nav_menu_items"
  on public.nav_menu_items for all
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "Students read visible nav items"
  on public.nav_menu_items for select
  to authenticated
  using (visible = true and area = 'student');

-- Seed default student menu items
insert into public.nav_menu_items (label, url, icon, area, is_default, is_external, visible, sort_order)
values
  ('Inicio', '/cursos', 'Home', 'student', true, false, true, 1),
  ('Comunidade', '/comunidade/feed', 'MessageSquare', 'student', true, false, true, 2),
  ('Ranking', '/ranking', 'Trophy', 'student', true, false, true, 3),
  ('Certificados', '/meus-certificados', 'Award', 'student', true, false, true, 4)
on conflict do nothing;

-- =============================================================================
-- 34. LESSON_COMMENTS
-- =============================================================================
create table if not exists public.lesson_comments (
  id                 uuid primary key default gen_random_uuid(),
  lesson_id          uuid not null references public.course_lessons(id) on delete cascade,
  course_id          uuid not null references public.courses(id) on delete cascade,
  author_id          uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id  uuid references public.lesson_comments(id) on delete cascade,
  body               text not null,
  likes_count        integer not null default 0,
  liked_by           uuid[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_lesson_comments_lesson_id on public.lesson_comments(lesson_id);
create index if not exists idx_lesson_comments_author_id on public.lesson_comments(author_id);
create index if not exists idx_lesson_comments_parent on public.lesson_comments(parent_comment_id);

create trigger set_lesson_comments_updated_at
  before update on public.lesson_comments
  for each row execute function public.handle_updated_at();

alter table public.lesson_comments enable row level security;

create policy "lesson_comments_read"
  on public.lesson_comments for select
  using (auth.uid() is not null);

create policy "lesson_comments_insert"
  on public.lesson_comments for insert
  with check (auth.uid() = author_id);

create policy "lesson_comments_update_author"
  on public.lesson_comments for update
  using (auth.uid() = author_id);

create policy "lesson_comments_delete_author"
  on public.lesson_comments for delete
  using (auth.uid() = author_id);

create policy "lesson_comments_admin"
  on public.lesson_comments for all
  using (public.is_admin_user());

-- =============================================================================
-- 35. COMMENTS_ENABLED (controle por curso e aula)
-- =============================================================================
alter table public.courses
  add column if not exists comments_enabled boolean not null default true;

alter table public.course_lessons
  add column if not exists comments_enabled boolean not null default true;

-- Gamificação: ação lesson_comment
insert into public.points_config (action_type, action_label, points, max_times, is_system, category, description, icon, enabled)
values ('lesson_comment', 'Comentário em aula', 3, 5, true, 'community', 'Ganhe pontos comentando nas aulas', '💬', true)
on conflict (action_type) do nothing;

-- =============================================================================
-- 36. INVITE LINKS
-- =============================================================================

create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  class_id uuid references public.classes(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  max_uses integer default null,
  use_count integer not null default 0,
  expires_at timestamptz default null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_link_uses (
  id uuid primary key default gen_random_uuid(),
  invite_link_id uuid references public.invite_links(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  used_at timestamptz not null default now()
);

create index if not exists idx_invite_links_slug on public.invite_links(slug);

alter table public.invite_links enable row level security;
alter table public.invite_link_uses enable row level security;

create policy "admins_manage_invite_links" on public.invite_links
  for all using (public.is_admin_user());

create policy "public_read_active_invite_links" on public.invite_links
  for select using (is_active = true);

create policy "admins_read_invite_uses" on public.invite_link_uses
  for all using (public.is_admin_user());

create trigger handle_updated_at_invite_links
  before update on public.invite_links
  for each row execute function public.handle_updated_at();

-- Add signup source tracking to profiles
alter table public.profiles add column if not exists signup_source text default 'direct';
alter table public.profiles add column if not exists invite_link_id uuid references public.invite_links(id) on delete set null;

-- =============================================================================
-- FIM DO SCHEMA
-- =============================================================================
-- Para popular com dados iniciais de teste, use:
-- supabase/migrations/002_seed_data.sql
