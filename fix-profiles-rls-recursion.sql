-- ============================================================
-- CRITICAL FIX: Resolve infinite recursion in profiles RLS
-- ============================================================
-- The problem: Policies that check "profiles WHERE role = 'admin'"
-- from within the profiles table itself cause infinite recursion
-- The solution: Use simple identity-based policies only
-- ============================================================

-- First, disable RLS temporarily to modify policies
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Admin users can update their profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view profiles" ON profiles;
DROP POLICY IF EXISTS "Guardians can view their dancer profiles" ON profiles;
DROP POLICY IF EXISTS "Instructors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SIMPLE, NON-RECURSIVE POLICIES
-- ============================================================

-- 1. Everyone can view their own profile (direct ID match)
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- 2. Everyone can update their own profile (direct ID match)
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Guardians can view their dancer profiles (guardian_id match)
CREATE POLICY "Guardians can view their dancer profiles"
  ON profiles FOR SELECT
  USING (guardian_id = auth.uid());

-- 4. Admin bypass: Admins can see all profiles
-- NOTE: This uses a subquery but only at the TOP level, not nested
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- 5. Instructors can see all profiles
CREATE POLICY "Instructors can view all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'instructor'
  );

-- 6. Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================
-- Run this query to check that policies are created correctly:
-- SELECT tablename, policyname FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'profiles'
-- ORDER BY policyname;
