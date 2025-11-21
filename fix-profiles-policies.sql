-- FIX: Remove circular dependency in PROFILES table policies
-- The profiles table policies must NOT call public.user_role() since that queries profiles
-- Run this in your Supabase SQL Editor

-- Drop all profiles policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON profiles';
  END LOOP;
END $$;

-- Recreate profiles policies WITHOUT calling the helper function
-- These policies only check auth.uid() and don't query other tables

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Guardians can view their linked dancer profiles
CREATE POLICY "Guardians can view their dancer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles child
      WHERE child.guardian_id = auth.uid()
      AND child.id = profiles.id
    )
  );

-- Simple approach: anyone can view instructor/admin profiles (no role check to avoid recursion)
-- Restrict at application level if needed
CREATE POLICY "Anyone can view instructor profiles"
  ON profiles FOR SELECT
  USING (profiles.role IN ('instructor', 'admin'));

-- Admins - check from JWT token if available, otherwise allow only via admin update
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR auth.uid() = id
  );

CREATE POLICY "Admins can view any profile"
  ON profiles FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'admin'
    OR auth.uid() = id
  );

-- Verify the policies are created
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
