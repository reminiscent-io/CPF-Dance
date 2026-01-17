-- Migration: Fix infinite recursion using SECURITY DEFINER functions
-- This completely breaks the recursion chain by bypassing RLS in helper functions

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Students can view classes linked to their lesson requests" ON classes;
DROP POLICY IF EXISTS "Students can view classes they are enrolled in" ON classes;

-- Create a SECURITY DEFINER function to check if user can view a class
-- This runs with the privileges of the function creator, bypassing RLS
CREATE OR REPLACE FUNCTION can_user_view_class(class_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if class is linked to user's lesson request
  IF EXISTS (
    SELECT 1 FROM private_lesson_requests plr
    JOIN students s ON s.id = plr.student_id
    WHERE plr.scheduled_class_id = class_id
    AND (s.profile_id = user_id OR s.guardian_id = user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is enrolled in the class
  IF EXISTS (
    SELECT 1 FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.class_id = class_id
    AND (s.profile_id = user_id OR s.guardian_id = user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Create a single policy that uses this function
-- This avoids recursion because the function uses SECURITY DEFINER
CREATE POLICY "Students can view their classes"
  ON classes FOR SELECT
  USING (
    can_user_view_class(id, auth.uid())
  );

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION can_user_view_class(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION can_user_view_class(UUID, UUID) IS
  'Checks if a user can view a class (via lesson request or enrollment). Uses SECURITY DEFINER to avoid RLS recursion.';
