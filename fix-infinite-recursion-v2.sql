-- FIX: Infinite Recursion in RLS Policies - VERSION 2 (Complete Reset)
-- This drops ALL policies and rebuilds them cleanly
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create/Replace helper function to get user role
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$;

-- ============================================================================
-- STEP 2: Drop ALL policies on ALL tables
-- ============================================================================

-- PROFILES table - drop all policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON profiles';
  END LOOP;
END $$;

-- STUDENTS table - drop all policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'students')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON students';
  END LOOP;
END $$;

-- CLASSES table - drop all policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'classes')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON classes';
  END LOOP;
END $$;

-- ENROLLMENTS table - drop all policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'enrollments')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON enrollments';
  END LOOP;
END $$;

-- NOTES table - drop all policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notes')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON notes';
  END LOOP;
END $$;

-- PRIVATE_LESSON_REQUESTS table - drop all policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'private_lesson_requests')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON private_lesson_requests';
  END LOOP;
END $$;

-- PAYMENTS table - drop all policies if table exists
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON payments';
  END LOOP;
END $$;

-- INSTRUCTOR_STUDENT_RELATIONSHIPS table - drop all policies if exists
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'instructor_student_relationships')
  LOOP
    EXECUTE 'DROP POLICY "' || r.policyname || '" ON instructor_student_relationships';
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create fresh policies using the helper function
-- ============================================================================

-- PROFILES TABLE POLICIES
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Instructors can view instructor profiles"
  ON profiles FOR SELECT
  USING (
    public.user_role() IN ('instructor', 'admin')
    AND profiles.role IN ('instructor', 'admin')
  );

CREATE POLICY "Guardians can view their dancer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles child
      WHERE child.guardian_id = auth.uid()
      AND child.id = profiles.id
    )
  );

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.user_role() = 'admin');

-- STUDENTS TABLE POLICIES
CREATE POLICY "Students can view their own student record"
  ON students FOR SELECT
  USING (profile_id = auth.uid() OR guardian_id = auth.uid());

CREATE POLICY "Instructors can view all students"
  ON students FOR SELECT
  USING (
    public.user_role() IN ('instructor', 'admin')
    OR profile_id = auth.uid() 
    OR guardian_id = auth.uid()
  );

CREATE POLICY "Instructors can create students"
  ON students FOR INSERT
  WITH CHECK (public.user_role() IN ('instructor', 'admin'));

CREATE POLICY "Instructors can update students"
  ON students FOR UPDATE
  USING (
    public.user_role() IN ('instructor', 'admin')
    OR profile_id = auth.uid() 
    OR guardian_id = auth.uid()
  );

CREATE POLICY "Instructors can delete students"
  ON students FOR DELETE
  USING (public.user_role() IN ('instructor', 'admin'));

CREATE POLICY "Admins can view all students"
  ON students FOR SELECT
  USING (public.user_role() = 'admin');

-- CLASSES TABLE POLICIES
CREATE POLICY "Users can view relevant classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.class_id = classes.id
      AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
    )
    OR
    (is_cancelled = false AND public.user_role() IN ('instructor', 'admin'))
    OR
    public.user_role() = 'admin'
  );

CREATE POLICY "Instructors can manage their classes"
  ON classes FOR ALL
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

CREATE POLICY "Admins can manage all classes"
  ON classes FOR ALL
  USING (public.user_role() = 'admin');

CREATE POLICY "Admins can view all classes"
  ON classes FOR SELECT
  USING (public.user_role() = 'admin');

-- ENROLLMENTS TABLE POLICIES
CREATE POLICY "Students can view their enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = enrollments.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can view their class enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view all enrollments"
  ON enrollments FOR SELECT
  USING (public.user_role() IN ('instructor', 'admin'));

CREATE POLICY "Instructors can manage their class enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can update their class enrollments"
  ON enrollments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can delete their class enrollments"
  ON enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Students can self-enroll"
  ON enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = enrollments.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  USING (public.user_role() = 'admin');

CREATE POLICY "Admins can manage all enrollments"
  ON enrollments FOR ALL
  USING (public.user_role() = 'admin');

-- NOTES TABLE POLICIES
CREATE POLICY "Students can view their notes"
  ON notes FOR SELECT
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = notes.student_id
      AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
      AND notes.visibility IN ('shared_with_student', 'shared_with_guardian')
    )
  );

CREATE POLICY "Students can create self notes"
  ON notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM students
      WHERE students.id = notes.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Students can view their own notes"
  ON notes FOR SELECT
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = notes.student_id
      AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can view notes"
  ON notes FOR SELECT
  USING (
    public.user_role() IN ('instructor', 'admin')
    OR author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.id = notes.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Instructors can create notes for their students"
  ON notes FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = notes.student_id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
    )
  );

CREATE POLICY "Instructors can view all notes"
  ON notes FOR SELECT
  USING (public.user_role() IN ('instructor', 'admin'));

CREATE POLICY "Instructors can manage notes"
  ON notes FOR ALL
  USING (author_id = auth.uid());

CREATE POLICY "Instructors can manage all notes"
  ON notes FOR ALL
  USING (public.user_role() = 'instructor');

CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (public.user_role() = 'admin');

CREATE POLICY "Admins can manage all notes"
  ON notes FOR ALL
  USING (public.user_role() = 'admin');

-- PRIVATE_LESSON_REQUESTS TABLE POLICIES
CREATE POLICY "Students can view their own requests"
  ON private_lesson_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Students can create requests"
  ON private_lesson_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
      AND students.profile_id = auth.uid()
    )
  );

CREATE POLICY "Instructors can view all requests"
  ON private_lesson_requests FOR SELECT
  USING (public.user_role() IN ('instructor', 'admin'));

CREATE POLICY "Instructors can manage requests"
  ON private_lesson_requests FOR ALL
  USING (public.user_role() = 'instructor');

CREATE POLICY "Admins can view all private lesson requests"
  ON private_lesson_requests FOR SELECT
  USING (public.user_role() = 'admin');

CREATE POLICY "Admins can manage all private lesson requests"
  ON private_lesson_requests FOR ALL
  USING (public.user_role() = 'admin');

CREATE POLICY "Admins can view all requests"
  ON private_lesson_requests FOR SELECT
  USING (public.user_role() = 'admin');

CREATE POLICY "Admins can manage all requests"
  ON private_lesson_requests FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT COUNT(*) as total_policies FROM pg_policies WHERE schemaname = 'public';

SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
