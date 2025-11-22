-- Add 'admin' to the user_role enum
-- Run this in your Supabase SQL Editor

-- Check current enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Add 'admin' value to the enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';

-- Verify the addition
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Now test if admin policies work by checking current policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'classes'
  AND policyname LIKE '%Admin%'
ORDER BY policyname;
