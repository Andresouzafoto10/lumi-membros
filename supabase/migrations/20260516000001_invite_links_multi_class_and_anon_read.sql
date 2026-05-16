-- 1. Allow invite links to grant access to multiple classes at once.
-- Adds a class_ids array, backfills from the legacy class_id column, and
-- keeps class_id readable for backwards compatibility.

ALTER TABLE public.invite_links
  ADD COLUMN IF NOT EXISTS class_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

UPDATE public.invite_links
SET class_ids = ARRAY[class_id]
WHERE class_id IS NOT NULL
  AND (class_ids IS NULL OR cardinality(class_ids) = 0);

CREATE INDEX IF NOT EXISTS invite_links_class_ids_idx
  ON public.invite_links USING GIN (class_ids);


-- 2. Fix RLS so unauthenticated visitors can actually load /convite/:slug.
--
-- The previous admin policy used PUBLIC role with USING is_admin_user().
-- anon could not EXECUTE that function (its body reads from profiles,
-- which anon also cannot SELECT), so every anon query against
-- invite_links errored before the public_read_active_invite_links
-- policy got a chance to grant access. The frontend then treated the
-- failure as a missing link and showed "link expirou".
--
-- Restricting the admin policy to the `authenticated` role makes anon
-- only evaluate the simple `is_active = true` policy.

DROP POLICY IF EXISTS admins_manage_invite_links ON public.invite_links;

CREATE POLICY admins_manage_invite_links
  ON public.invite_links
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());
