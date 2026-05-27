-- Per-course vertical banner (9:16). Horizontal banner stays in banner_url.
-- Session card_orientation decides which banner students see; both are stored
-- so switching orientation never loses an uploaded image.
alter table public.courses
  add column if not exists banner_vertical_url text not null default '';

notify pgrst, 'reload schema';
