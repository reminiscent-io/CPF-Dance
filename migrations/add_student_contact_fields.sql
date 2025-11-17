-- Add contact fields to students table for students without linked profiles
-- This allows instructors to add students before they create accounts

ALTER TABLE students
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add a comment explaining the usage
COMMENT ON COLUMN students.full_name IS 'Student name - used when profile_id is null (student has no account yet)';
COMMENT ON COLUMN students.email IS 'Student email - used when profile_id is null';
COMMENT ON COLUMN students.phone IS 'Student phone - used when profile_id is null';
