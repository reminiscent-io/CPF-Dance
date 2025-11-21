-- FIX: Infinite Recursion in RLS Policies
-- This fixes the circular dependency between profiles and students tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create a helper function to get user role (in public schema)
-- ============================================================================

-- This function runs with SECURITY DEFINER which bypasses RLS
-- It safely gets the user's role without triggering policy recursion
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
-- STEP 2: Fix STUDENTS table policies to use the helper function
-- ============================================================================

-- Drop policies that cause recursion
DROP POLICY IF EXISTS "Instructors can create students" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Instructors can view all students" ON students;
DROP POLICY IF EXISTS "Instructors can manage students" ON students;
DROP POLICY IF EXISTS "Instructors can view their students" ON students;
DROP POLICY IF EXISTS "Instructors can update their students" ON students;
DROP POLICY IF EXISTS "Students can update their own record" ON students;

-- Recreate using helper function instead of querying profiles directly
CREATE POLICY "Instructors can view all students"
  ON students FOR SELECT
  USING (
    public.user_role() IN ('instructor', 'admin')
    OR profile_id = auth.uid() 
    OR guardian_id = auth.uid()
  );

CREATE POLICY "Instructors can create students"
  ON students FOR INSERT
  WITH CHECK (
    public.user_role() IN ('instructor', 'admin')
  );

CREATE POLICY "Instructors can update students"
  ON students FOR UPDATE
  USING (
    public.user_role() IN ('instructor', 'admin')
    OR profile_id = auth.uid() 
    OR guardian_id = auth.uid()
  );

CREATE POLICY "Instructors can delete students"
  ON students FOR DELETE
  USING (
    public.user_role() IN ('instructor', 'admin')
  );

CREATE POLICY "Students can update their own record"
  ON students FOR UPDATE
  USING (profile_id = auth.uid() OR guardian_id = auth.uid());

-- ============================================================================
-- STEP 3: Fix PROFILES table policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Instructors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Instructors can view related student profiles" ON profiles;
DROP POLICY IF EXISTS "Instructors can view instructor profiles" ON profiles;
DROP POLICY IF EXISTS "Guardians can view their dancer profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Instructors can view other instructor profiles
CREATE POLICY "Instructors can view instructor profiles"
  ON profiles FOR SELECT
  USING (
    public.user_role() IN ('instructor', 'admin')
    AND profiles.role IN ('instructor', 'admin')
  );

-- Guardians can view their linked dancer profiles
CREATE POLICY "Guardians can view their dancer profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles child
      WHERE child.guardian_id = auth.uid()
      AND child.id = profiles.id
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.user_role() = 'admin');

-- ============================================================================
-- STEP 4: Fix other policies that query profiles table
-- ============================================================================

-- Fix classes policies
DROP POLICY IF EXISTS "Users can view relevant classes" ON classes;
DROP POLICY IF EXISTS "Everyone can view active classes" ON classes;

CREATE POLICY "Users can view relevant classes"
  ON classes FOR SELECT
  USING (
    -- Students see enrolled classes
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN students s ON e.student_id = s.id
      WHERE e.class_id = classes.id
      AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
    )
    OR
    -- Instructors see all active classes
    (is_cancelled = false AND public.user_role() IN ('instructor', 'admin'))
    OR
    -- Admins see all
    public.user_role() = 'admin'
  );

-- Fix enrollments
DROP POLICY IF EXISTS "Admins can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON enrollments;

CREATE POLICY "Instructors can view all enrollments"
  ON enrollments FOR SELECT
  USING (public.user_role() IN ('instructor', 'admin'));

CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  USING (public.user_role() = 'admin');

-- Fix notes
DROP POLICY IF EXISTS "Admins can view non-private notes" ON notes;
DROP POLICY IF EXISTS "Instructors and Admins can manage all notes" ON notes;

CREATE POLICY "Instructors can view notes"
  ON notes FOR SELECT
  USING (
    public.user_role() IN ('instructor', 'admin')
    OR author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.id = notes.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
      AND notes.visibility IN ('shared_with_student', 'shared_with_guardian')
    )
  );

CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (
    public.user_role() = 'admin'
    OR author_id = auth.uid()
  );

-- Fix private lesson requests
DROP POLICY IF EXISTS "Admins can manage all requests" ON private_lesson_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON private_lesson_requests;

CREATE POLICY "Admins can view all requests"
  ON private_lesson_requests FOR SELECT
  USING (
    public.user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Admins can manage all requests"
  ON private_lesson_requests FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test the helper function
SELECT public.user_role() as my_role;

-- List all policies
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
