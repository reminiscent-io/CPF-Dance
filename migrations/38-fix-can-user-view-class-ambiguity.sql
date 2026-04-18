-- Migration 38: Fix column ambiguity in can_user_view_class
-- Context: Migration 30 declared can_user_view_class(class_id UUID, user_id UUID)
-- with parameter names that collide with the enrollments.class_id column and
-- students.profile_id/guardian_id context. When a Student role queries the
-- classes table, the "Students can view their classes" RLS policy invokes
-- this function and Postgres errors:
--   ERROR: 42702: column reference "class_id" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
-- Migration 31 (which renamed params to p_class_id/p_user_id) was never
-- applied to production, so the ambiguity persists live.
--
-- Fix: keep the existing function signature (so the policy reference in
-- "Students can view their classes" and classes_select_policy remains valid)
-- and add the PL/pgSQL #variable_conflict use_variable directive. This tells
-- PL/pgSQL to resolve bare identifiers to the parameter when a column shares
-- the same name, eliminating the ambiguity without requiring a DROP/CREATE
-- that would cascade through dependent policies.

CREATE OR REPLACE FUNCTION can_user_view_class(class_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
#variable_conflict use_variable
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
