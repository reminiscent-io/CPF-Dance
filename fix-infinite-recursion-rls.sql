-- ============================================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================================================
--
-- PROBLEM: Policies using user_role() function or querying the profiles table
-- create circular dependencies that cause infinite recursion errors.
--
-- SOLUTION: Replace all user_role() calls and profiles table queries with
-- direct JWT metadata checks: (auth.jwt() -> 'user_metadata' ->> 'role')
--
-- This script drops and recreates policies with EXACT same logic, just
-- using JWT metadata instead of database queries.
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- CLASSES TABLE (4 policies with user_role())
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
DROP POLICY IF EXISTS "Users can view relevant classes" ON classes;

CREATE POLICY "Admins can manage all classes"
  ON classes FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all classes"
  ON classes FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Users can view relevant classes"
  ON classes FOR SELECT
  USING (
    (EXISTS (
      SELECT 1
      FROM (enrollments e JOIN students s ON ((e.student_id = s.id)))
      WHERE ((e.class_id = classes.id) AND ((s.profile_id = auth.uid()) OR (s.guardian_id = auth.uid())))
    ))
    OR (
      (is_cancelled = false)
      AND ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']))
    )
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  );

-- ============================================================================
-- ENROLLMENTS TABLE (3 policies with user_role())
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON enrollments;

CREATE POLICY "Admins can manage all enrollments"
  ON enrollments FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can view all enrollments"
  ON enrollments FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

-- ============================================================================
-- NOTES TABLE (5 policies with user_role())
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all notes" ON notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can manage all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can view all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can view notes" ON notes;

CREATE POLICY "Admins can manage all notes"
  ON notes FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can manage all notes"
  ON notes FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can view all notes"
  ON notes FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

CREATE POLICY "Instructors can view notes"
  ON notes FOR SELECT
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']))
    OR (author_id = auth.uid())
    OR (EXISTS (
      SELECT 1
      FROM students
      WHERE ((students.id = notes.student_id) AND ((students.profile_id = auth.uid()) OR (students.guardian_id = auth.uid())))
    ))
  );

-- ============================================================================
-- PRIVATE_LESSON_REQUESTS TABLE (6 policies with user_role())
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all private lesson requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Admins can manage all requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Admins can view all private lesson requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can manage requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can view all requests" ON private_lesson_requests;

CREATE POLICY "Admins can manage all private lesson requests"
  ON private_lesson_requests FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage all requests"
  ON private_lesson_requests FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all private lesson requests"
  ON private_lesson_requests FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all requests"
  ON private_lesson_requests FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can manage requests"
  ON private_lesson_requests FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can view all requests"
  ON private_lesson_requests FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

-- ============================================================================
-- STUDENTS TABLE (5 policies with user_role())
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Instructors can create students" ON students;
DROP POLICY IF EXISTS "Instructors can delete students" ON students;
DROP POLICY IF EXISTS "Instructors can update students" ON students;
DROP POLICY IF EXISTS "Instructors can view all students" ON students;

CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can create students"
  ON students FOR INSERT
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

CREATE POLICY "Instructors can delete students"
  ON students FOR DELETE
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

CREATE POLICY "Instructors can update students"
  ON students FOR UPDATE
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']))
    OR (profile_id = auth.uid())
    OR (guardian_id = auth.uid())
  );

CREATE POLICY "Instructors can view all students"
  ON students FOR SELECT
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']))
    OR (profile_id = auth.uid())
    OR (guardian_id = auth.uid())
  );

-- ============================================================================
-- INSTRUCTOR_STUDENT_RELATIONSHIPS TABLE (3 policies querying profiles)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Admins can manage all relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Instructors can create relationships" ON instructor_student_relationships;

CREATE POLICY "Admins can create relationships"
  ON instructor_student_relationships FOR INSERT
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage all relationships"
  ON instructor_student_relationships FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can create relationships"
  ON instructor_student_relationships FOR INSERT
  WITH CHECK (
    (instructor_id = auth.uid())
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor')
  );

-- ============================================================================
-- PAYMENT_EVENTS TABLE (4 policies querying profiles)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create payment events" ON payment_events;
DROP POLICY IF EXISTS "Admins can view all payment events" ON payment_events;
DROP POLICY IF EXISTS "Instructors can create payment events" ON payment_events;
DROP POLICY IF EXISTS "Studio admins can view studio payment events" ON payment_events;

CREATE POLICY "Admins can create payment events"
  ON payment_events FOR INSERT
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all payment events"
  ON payment_events FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can create payment events"
  ON payment_events FOR INSERT
  WITH CHECK (
    (actor_id = auth.uid())
    OR ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'studio_admin']))
  );

CREATE POLICY "Studio admins can view studio payment events"
  ON payment_events FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'studio_admin');

-- ============================================================================
-- STUDIO_INQUIRIES TABLE (4 policies querying profiles)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all inquiries" ON studio_inquiries;
DROP POLICY IF EXISTS "Admins can manage all studio inquiries" ON studio_inquiries;
DROP POLICY IF EXISTS "Admins can view all studio inquiries" ON studio_inquiries;
DROP POLICY IF EXISTS "Instructors can view studio inquiries" ON studio_inquiries;

CREATE POLICY "Admins can manage all inquiries"
  ON studio_inquiries FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage all studio inquiries"
  ON studio_inquiries FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all studio inquiries"
  ON studio_inquiries FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can view studio inquiries"
  ON studio_inquiries FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

-- ============================================================================
-- STUDIOS TABLE (2 policies querying profiles)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all studios" ON studios;
DROP POLICY IF EXISTS "Admins can view all studios" ON studios;

CREATE POLICY "Admins can manage all studios"
  ON studios FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all studios"
  ON studios FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================================
-- PROFILES TABLE (Fix incorrect JWT path in existing policies)
-- ============================================================================
-- Note: These policies currently use (auth.jwt() ->> 'role') which is incorrect
-- They need to use (auth.jwt() -> 'user_metadata' ->> 'role')

DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view any profile" ON profiles;

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    OR (auth.uid() = id)
  );

CREATE POLICY "Admins can view any profile"
  ON profiles FOR SELECT
  USING (
    ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
    OR (auth.uid() = id)
  );

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'SUCCESS: All RLS policies updated!' as status;
SELECT 'Replaced user_role() and profiles queries with JWT metadata checks' as details;
SELECT 'Infinite recursion errors should now be resolved' as result;
SELECT 'Test your /api/classes endpoint to verify the fix' as next_step;
