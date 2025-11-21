-- FINAL FIX: Remove all circular references from profiles table
-- The issue: "Guardians can view their dancer profiles" queries profiles table within profiles policy
-- This causes infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Guardians can view their dancer profiles" ON profiles;

-- Recreate WITHOUT querying profiles table - check guardian_id column directly
CREATE POLICY "Guardians can view their dancer profiles"
  ON profiles FOR SELECT
  USING (guardian_id = auth.uid());

-- Verify
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
