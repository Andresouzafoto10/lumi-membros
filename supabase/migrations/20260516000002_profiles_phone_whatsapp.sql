-- Add phone + whatsapp columns to profiles so the CSV importer can
-- persist these optional fields. Both are plain text (no validation
-- enforced at the database level — the UI strips formatting where
-- appropriate but stores whatever the admin imports).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text;
