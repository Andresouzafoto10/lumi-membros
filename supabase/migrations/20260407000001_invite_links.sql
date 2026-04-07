CREATE TABLE IF NOT EXISTS public.invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  max_uses integer DEFAULT NULL,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invite_link_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_link_id uuid REFERENCES public.invite_links(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_links_slug ON public.invite_links(slug);

ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_link_uses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invite_links' AND policyname = 'admins_manage_invite_links') THEN
    CREATE POLICY "admins_manage_invite_links" ON public.invite_links FOR ALL USING (public.is_admin_user());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invite_links' AND policyname = 'public_read_active_invite_links') THEN
    CREATE POLICY "public_read_active_invite_links" ON public.invite_links FOR SELECT USING (is_active = true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invite_link_uses' AND policyname = 'admins_read_invite_uses') THEN
    CREATE POLICY "admins_read_invite_uses" ON public.invite_link_uses FOR ALL USING (public.is_admin_user());
  END IF;
END $$;

CREATE OR REPLACE TRIGGER handle_updated_at_invite_links
  BEFORE UPDATE ON public.invite_links
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_source text DEFAULT 'direct';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_link_id uuid REFERENCES public.invite_links(id) ON DELETE SET NULL;
