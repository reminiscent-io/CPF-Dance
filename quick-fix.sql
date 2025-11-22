-- QUICK FIX: Just drop the problematic policy
-- Run this in Supabase SQL Editor NOW

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Verify it's gone
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
