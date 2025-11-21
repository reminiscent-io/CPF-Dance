-- Fix for Infinite Recursion in RLS Policies
-- This script replaces all user_role() function calls and profiles table queries
-- with direct JWT metadata checks to eliminate circular dependencies
-- Generated for dance class management platform
-- Applied: Replace profiles queries with JWT metadata access

-- ============================================================================
-- CLASSES TABLE POLICIES
-- ============================================================================

-- Drop existing classes policies
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
DROP POLICY IF EXISTS "Instructors can manage their classes" ON classes;
DROP POLICY IF EXISTS "Users can view relevant classes" ON classes;

-- Recreate classes policies with JWT checks
CREATE POLICY "Admins can manage all classes" ON classes
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all classes" ON classes
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can manage their classes" ON classes
  FOR ALL USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Users can view relevant classes" ON classes
  FOR SELECT USING (
    (EXISTS (
      SELECT 1 FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.class_id = classes.id
        AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
    ))
    OR (is_cancelled = false AND (auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']))
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ============================================================================
-- ENROLLMENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can delete their class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can manage their class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can update their class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view their class enrollments" ON enrollments;
DROP POLICY IF EXISTS "Students can self-enroll" ON enrollments;
DROP POLICY IF EXISTS "Students can view their enrollments" ON enrollments;

CREATE POLICY "Admins can manage all enrollments" ON enrollments
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all enrollments" ON enrollments
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can delete their class enrollments" ON enrollments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
        AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can manage their class enrollments" ON enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
        AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update their class enrollments" ON enrollments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
        AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view all enrollments" ON enrollments
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

CREATE POLICY "Instructors can view their class enrollments" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
        AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can self-enroll" ON enrollments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = enrollments.student_id
        AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their enrollments" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = enrollments.student_id
        AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

-- ============================================================================
-- INSTRUCTOR_STUDENT_RELATIONSHIPS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins and instructors can manage relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Admins can create relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Dancers can view their relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Instructors can create relationships" ON instructor_student_relationships;

CREATE POLICY "Admins and instructors can manage relationships" ON instructor_student_relationships
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['admin', 'instructor']))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['admin', 'instructor']));

CREATE POLICY "Admins can create relationships" ON instructor_student_relationships
  FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Dancers can view their relationships" ON instructor_student_relationships
  FOR SELECT USING (
    student_id IN (
      SELECT students.id FROM students
      WHERE students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can create relationships" ON instructor_student_relationships
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid() 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor'
  );

-- ============================================================================
-- NOTES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all notes" ON notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
DROP POLICY IF EXISTS "Instructors and Admins can manage all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can create notes for their students" ON notes;
DROP POLICY IF EXISTS "Instructors can manage all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can manage notes" ON notes;
DROP POLICY IF EXISTS "Instructors can view all notes" ON notes;
DROP POLICY IF EXISTS "Instructors can view notes" ON notes;
DROP POLICY IF EXISTS "Students can create self notes" ON notes;
DROP POLICY IF EXISTS "Students can view their notes" ON notes;
DROP POLICY IF EXISTS "Students can view their own notes" ON notes;
DROP POLICY IF EXISTS "Studio users can view notes shared with studio" ON notes;

CREATE POLICY "Admins can manage all notes" ON notes
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all notes" ON notes
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors and Admins can manage all notes" ON notes
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

CREATE POLICY "Instructors can create notes for their students" ON notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = notes.student_id
        AND instructor_student_relationships.instructor_id = auth.uid()
        AND instructor_student_relationships.relationship_status = 'active'
    )
  );

CREATE POLICY "Instructors can manage all notes" ON notes
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'instructor');

CREATE POLICY "Instructors can manage notes" ON notes
  FOR ALL USING (author_id = auth.uid());

CREATE POLICY "Instructors can view all notes" ON notes
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

CREATE POLICY "Instructors can view notes" ON notes
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin'])
    OR author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.id = notes.student_id
        AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can create self notes" ON notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM students
      WHERE students.id = notes.student_id
        AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their notes" ON notes
  FOR SELECT USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = notes.student_id
        AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
        AND notes.visibility = ANY (ARRAY['shared_with_student'::text, 'shared_with_guardian'::text])
    )
  );

CREATE POLICY "Students can view their own notes" ON notes
  FOR SELECT USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = notes.student_id
        AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Studio users can view notes shared with studio" ON notes
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'studio'
    AND notes.visibility = 'shared_with_studio'::text
  );

-- ============================================================================
-- PRIVATE_LESSON_REQUESTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can manage their requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can view requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Students can create requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Students can view their requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Students can update their requests" ON private_lesson_requests;

CREATE POLICY "Admins can manage requests" ON private_lesson_requests
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can manage their requests" ON private_lesson_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = private_lesson_requests.student_id
        AND instructor_student_relationships.instructor_id = auth.uid()
        AND instructor_student_relationships.relationship_status = 'active'
    )
  );

CREATE POLICY "Instructors can view requests" ON private_lesson_requests
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin']));

CREATE POLICY "Students can create requests" ON private_lesson_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
        AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their requests" ON private_lesson_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
        AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can update their requests" ON private_lesson_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
        AND students.profile_id = auth.uid()
    )
  );

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Dancers can view themselves" ON students;
DROP POLICY IF EXISTS "Instructors can view their students" ON students;
DROP POLICY IF EXISTS "Students can view themselves" ON students;

CREATE POLICY "Admins can manage all students" ON students
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all students" ON students
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Dancers can view themselves" ON students
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Instructors can view their students" ON students
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin'])
  );

CREATE POLICY "Students can view themselves" ON students
  FOR SELECT USING (
    profile_id = auth.uid() OR guardian_id = auth.uid()
  );

-- ============================================================================
-- PAYMENT_EVENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create payment events" ON payment_events;
DROP POLICY IF EXISTS "Admins can manage payment events" ON payment_events;
DROP POLICY IF EXISTS "Admins can view all payment events" ON payment_events;
DROP POLICY IF EXISTS "Instructors can view payment events" ON payment_events;

CREATE POLICY "Admins can create payment events" ON payment_events
  FOR INSERT WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can manage payment events" ON payment_events
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view all payment events" ON payment_events
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Instructors can view payment events" ON payment_events
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = ANY (ARRAY['instructor', 'admin'])
  );

-- ============================================================================
-- STUDIO_INQUIRIES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage studio inquiries" ON studio_inquiries;
DROP POLICY IF EXISTS "Admins can view studio inquiries" ON studio_inquiries;
DROP POLICY IF EXISTS "Public can create inquiries" ON studio_inquiries;
DROP POLICY IF EXISTS "Studio can view their inquiries" ON studio_inquiries;

CREATE POLICY "Admins can manage studio inquiries" ON studio_inquiries
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admins can view studio inquiries" ON studio_inquiries
  FOR SELECT USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public can create inquiries" ON studio_inquiries
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Studio can view their inquiries" ON studio_inquiries
  FOR SELECT USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'studio'
  );

-- ============================================================================
-- STUDIOS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage studios" ON studios;
DROP POLICY IF EXISTS "Public can view studios" ON studios;

CREATE POLICY "Admins can manage studios" ON studios
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

CREATE POLICY "Public can view studios" ON studios
  FOR SELECT USING (true);

-- ============================================================================
-- PROFILES TABLE POLICIES - Fix JWT path
-- ============================================================================

DROP POLICY IF EXISTS "Admin users can update their profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Admin users can update their profile" ON profiles
  FOR UPDATE USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' AND id = auth.uid());

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- ============================================================================
-- Verification Query - Run after applying this script
-- ============================================================================

-- This query should return 0 rows if the fix was successful
-- If it returns rows, those policies still have problematic queries
/*
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text LIKE '%user_role()%'
    OR with_check::text LIKE '%user_role()%'
    OR qual::text LIKE '%profiles%' AND qual::text LIKE '%EXISTS%' 
  )
ORDER BY tablename, policyname;
*/
