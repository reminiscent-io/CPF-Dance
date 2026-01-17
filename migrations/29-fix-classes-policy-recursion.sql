-- Migration: Fix infinite recursion in classes RLS policies
-- The issue: policies with JOINs can create circular references

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Students can view classes linked to their lesson requests" ON classes;
DROP POLICY IF EXISTS "Students can view classes they are enrolled in" ON classes;

-- Recreate them WITHOUT joins to avoid recursion
-- Instead, we'll use simple subqueries that don't trigger cascading policy checks

-- Policy 1: Students can view classes linked to their lesson requests
-- Uses a direct subquery to private_lesson_requests without joining students
CREATE POLICY "Students can view classes linked to their lesson requests"
  ON classes FOR SELECT
  USING (
    id IN (
      SELECT scheduled_class_id
      FROM private_lesson_requests
      WHERE scheduled_class_id IS NOT NULL
      AND student_id IN (
        SELECT id FROM students
        WHERE profile_id = auth.uid() OR guardian_id = auth.uid()
      )
    )
  );

-- Policy 2: Students can view classes they are enrolled in
-- Uses a direct subquery to enrollments without joining students
CREATE POLICY "Students can view classes they are enrolled in"
  ON classes FOR SELECT
  USING (
    id IN (
      SELECT class_id
      FROM enrollments
      WHERE student_id IN (
        SELECT id FROM students
        WHERE profile_id = auth.uid() OR guardian_id = auth.uid()
      )
    )
  );

-- Add index to improve performance of these subqueries
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_private_lesson_requests_scheduled_class_id_student
  ON private_lesson_requests(scheduled_class_id, student_id)
  WHERE scheduled_class_id IS NOT NULL;
