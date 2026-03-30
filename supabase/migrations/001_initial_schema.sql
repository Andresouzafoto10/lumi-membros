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

create policy "profiles: leitura pública"
  on public.profiles for select using (true);

create policy "profiles: usuário edita o próprio"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admin gerencia todos"
  on public.profiles for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('owner','admin','support')
    )
  );

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
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid unique not null references public.profiles(id) on delete cascade,
  points      integer not null default 0,
  badges      text[] not null default '{}',
  updated_at  timestamptz not null default now()
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
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  background_url  text not null default '',
  blocks          jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
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
  template_id    uuid not null references public.certificate_templates(id),
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
-- FIM DO SCHEMA
-- =============================================================================
-- Para popular com dados iniciais de teste, use:
-- supabase/migrations/002_seed_data.sql
