-- Fix infinite recursion in profiles RLS policies
-- Run this in your Supabase SQL Editor IMMEDIATELY

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Instructors can view all profiles" ON profiles;

-- Replace with a simple policy that allows everyone to view all profiles
-- This is safe because profile information is needed by the app to function
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Optionally, if you want to restrict viewing to authenticated users only:
-- CREATE POLICY "Authenticated users can view all profiles"
--   ON profiles FOR SELECT
--   USING (auth.uid() IS NOT NULL);
