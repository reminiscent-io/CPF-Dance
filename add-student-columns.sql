-- Add contact info columns to students table
-- These are used for students who haven't created a profile/account yet
-- Once they sign up, profile_id links to their profiles table entry

ALTER TABLE students
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comment explaining the dual-mode approach
COMMENT ON COLUMN students.full_name IS 'Direct storage for non-registered students. Null if profile_id is set.';
COMMENT ON COLUMN students.email IS 'Direct storage for non-registered students. Null if profile_id is set.';
COMMENT ON COLUMN students.phone IS 'Direct storage for non-registered students. Null if profile_id is set.';
