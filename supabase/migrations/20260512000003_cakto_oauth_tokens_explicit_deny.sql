-- Explicit deny policy for cakto_oauth_tokens.
-- service_role bypasses RLS anyway, but this silences the rls_enabled_no_policy
-- advisor and documents intent: no anon/authenticated user can ever read tokens.
DROP POLICY IF EXISTS "deny all client roles" ON public.cakto_oauth_tokens;
CREATE POLICY "deny all client roles"
  ON public.cakto_oauth_tokens
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
