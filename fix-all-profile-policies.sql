-- COMPREHENSIVE FIX: Drop ALL policies on profiles table and recreate safe ones
-- Run this in your Supabase SQL Editor

-- First, let's see what policies currently exist
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Current policies on profiles table:';
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles'
    LOOP
        RAISE NOTICE '  - %', policy_record.policyname;
    END LOOP;
END $$;

-- Drop ALL existing policies on the profiles table (every possible one)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Instructors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;  -- THIS ONE CAUSES RECURSION!
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admin users can update their profile" ON profiles;
DROP POLICY IF EXISTS "Guardians can view their dancer profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view instructor profiles" ON profiles;

-- Now create ONLY the simple, safe policies
-- Policy 1: Anyone can view any profile (no recursion)
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Policy 2: Users can update their own profile only
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Verify the policies
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
