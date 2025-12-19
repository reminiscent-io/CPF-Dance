-- Migration: Remove Studio Portal
-- Description: Removes studio and studio_admin roles, deletes studio users, and updates the user_role enum
-- Date: 2025-12-06

-- Step 1: Delete all profiles with studio or studio_admin role
DELETE FROM profiles
WHERE role IN ('studio', 'studio_admin');

-- Step 2: Update the user_role enum to remove studio roles
-- We need to recreate the enum without studio and studio_admin
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM ('instructor', 'dancer', 'guardian', 'admin');

-- Update the profiles table to use the new enum
ALTER TABLE profiles
  ALTER COLUMN role TYPE user_role
  USING role::text::user_role;

-- Drop the old enum
DROP TYPE user_role_old;

-- Step 3: Update any RLS policies that referenced studio_admin
-- Note: Most RLS policies should be updated in supabase-schema.sql
-- This migration focuses on cleaning up data

-- Migration complete
-- Studio portal has been removed
-- The studios table and studio_inquiries table remain intact for instructor use
