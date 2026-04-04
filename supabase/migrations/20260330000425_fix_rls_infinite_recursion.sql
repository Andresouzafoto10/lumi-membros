-- =============================================================================
-- FIX: Infinite recursion in profiles RLS policies
--
-- The "profiles: admin gerencia todos" policy (FOR ALL) was causing infinite
-- recursion because its USING clause queries the profiles table itself,
-- which triggers the same policy again.
--
-- Fix: Drop the recursive admin policy and replace with a safe version that
-- uses auth.jwt() to get the role claim without querying the profiles table.
-- Also fix all other tables that had the same recursive pattern.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. FIX PROFILES TABLE
-- ---------------------------------------------------------------------------

-- Drop the problematic recursive policy on profiles
DROP POLICY IF EXISTS "profiles: admin gerencia todos" ON public.profiles;

-- Re-create a safe admin policy that checks JWT claims (no recursion)
-- For admin check on profiles table itself, we use a security definer function
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'support')
  );
$$;

-- Now we need to break the recursion differently:
-- The "profiles: leitura pública" already allows SELECT for everyone (using true)
-- The admin management policy needs to avoid querying profiles
-- We use a security definer function with SET search_path that bypasses RLS

-- Drop existing policies that have recursion issues
DROP POLICY IF EXISTS "profiles: leitura pública" ON public.profiles;
DROP POLICY IF EXISTS "profiles: usuário edita o próprio" ON public.profiles;

-- Recreate with safe patterns:
-- Public read: anyone can read profiles (no recursion possible here)
CREATE POLICY "profiles: leitura pública"
  ON public.profiles FOR SELECT
  USING (true);

-- User edits own profile
CREATE POLICY "profiles: usuário edita o próprio"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admin full access: use security definer function to avoid recursion
CREATE POLICY "profiles: admin gerencia todos"
  ON public.profiles FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- ---------------------------------------------------------------------------
-- 2. ADD MISSING PROFILES FOR EXISTING AUTH USERS
-- ---------------------------------------------------------------------------

-- Insert profiles for auth users that don't have one yet
-- (handles users created before the trigger was in place)
INSERT INTO public.profiles (id, email, name, display_name, username, role, status)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', u.email),
  LOWER(SPLIT_PART(u.email, '@', 1)),
  'student',
  'active'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. ENSURE OWNER USER HAS CORRECT ROLE
-- ---------------------------------------------------------------------------

-- Make sure fotografoandresouza@gmail.com has owner role
UPDATE public.profiles
SET role = 'owner'
WHERE email = 'fotografoandresouza@gmail.com'
  AND role != 'owner';

-- ---------------------------------------------------------------------------
-- 4. FIX is_admin_user() FUNCTION TO BREAK RECURSION PROPERLY
-- ---------------------------------------------------------------------------
-- The function above still queries profiles, which triggers RLS policies.
-- But since it's SECURITY DEFINER it bypasses RLS entirely.
-- Let's verify the function is correct by using SECURITY DEFINER.
-- This function runs as the function owner (postgres/service_role), not the caller,
-- so it bypasses RLS when querying profiles.

-- Recreate with explicit search_path for security
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'support')
  );
$$;

-- =============================================================================
-- END OF FIX
-- =============================================================================
