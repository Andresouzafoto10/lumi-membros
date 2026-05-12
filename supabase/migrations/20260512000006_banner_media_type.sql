-- Add media_type column to course_banners for video / canva embed support.
alter table public.course_banners
  add column if not exists media_type text not null default 'image'
  check (media_type in ('image', 'video', 'embed'));
