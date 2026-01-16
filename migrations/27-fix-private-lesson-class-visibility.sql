-- Migration: Fix private lesson class visibility for dancers
-- This allows dancers to view classes that are linked to their private lesson requests

-- Add policy to allow students to view classes linked to their lesson requests
CREATE POLICY "Students can view classes linked to their lesson requests"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM private_lesson_requests
      JOIN students ON students.id = private_lesson_requests.student_id
      WHERE private_lesson_requests.scheduled_class_id = classes.id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

-- Also add a policy to allow students to view classes they are enrolled in
CREATE POLICY "Students can view classes they are enrolled in"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      JOIN students ON students.id = enrollments.student_id
      WHERE enrollments.class_id = classes.id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );
