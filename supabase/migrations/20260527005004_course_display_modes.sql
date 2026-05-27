alter table public.course_sessions
  add column if not exists card_orientation text default 'horizontal';

update public.course_sessions
set card_orientation = 'horizontal'
where card_orientation is null;

alter table public.course_sessions
  alter column card_orientation set default 'horizontal',
  alter column card_orientation set not null;

alter table public.course_sessions
  drop constraint if exists course_sessions_card_orientation_check;

alter table public.course_sessions
  add constraint course_sessions_card_orientation_check
  check (card_orientation in ('horizontal', 'vertical'));

alter table public.platform_settings
  add column if not exists courses_display_mode text default 'grid',
  add column if not exists courses_carousel_autoplay boolean default false;

update public.platform_settings
set
  courses_display_mode = coalesce(courses_display_mode, 'grid'),
  courses_carousel_autoplay = coalesce(courses_carousel_autoplay, false);

alter table public.platform_settings
  alter column courses_display_mode set default 'grid',
  alter column courses_display_mode set not null,
  alter column courses_carousel_autoplay set default false,
  alter column courses_carousel_autoplay set not null;

alter table public.platform_settings
  drop constraint if exists platform_settings_courses_display_mode_check;

alter table public.platform_settings
  add constraint platform_settings_courses_display_mode_check
  check (courses_display_mode in ('grid', 'carousel'));

notify pgrst, 'reload schema';
