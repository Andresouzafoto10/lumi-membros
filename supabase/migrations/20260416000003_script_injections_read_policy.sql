-- ============================================================================
-- Fix script_injections RLS: separate read (all authenticated) from write (admin).
-- ----------------------------------------------------------------------------
-- Previous policy `Admin full access` blocked SELECT for non-admin users, so
-- pixels/analytics scripts marked `apply_to="all"` or `"student_only"` never
-- loaded on the student layout. Now authenticated users can read enabled
-- scripts, but only admins can create/update/delete.
-- ============================================================================

DROP POLICY IF EXISTS "Admin full access script_injections" ON public.script_injections;

CREATE POLICY "Authenticated read enabled scripts"
  ON public.script_injections FOR SELECT
  TO authenticated
  USING (enabled = true);

CREATE POLICY "Admin write script_injections"
  ON public.script_injections FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin update script_injections"
  ON public.script_injections FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admin delete script_injections"
  ON public.script_injections FOR DELETE
  TO authenticated
  USING (public.is_admin_user());
