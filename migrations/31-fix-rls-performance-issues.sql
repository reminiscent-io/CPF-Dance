-- Migration: Fix RLS Performance Issues
-- Description: Removes duplicate policies and optimizes auth.uid() calls
-- This migration addresses three categories of linter warnings:
-- 1. auth_rls_initplan: auth.uid() being re-evaluated per row
-- 2. multiple_permissive_policies: duplicate overlapping policies
-- 3. duplicate_index: duplicate indexes on enrollments table

-- =====================================================
-- PART 1: REMOVE DUPLICATE POLICIES ON STUDENTS TABLE
-- =====================================================
-- Migration 22 created consolidated policies (students_*_policy)
-- Migration 24 and 28 inadvertently added duplicate policies

DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage students" ON public.students;
DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;

-- =====================================================
-- PART 2: REMOVE DUPLICATE POLICIES ON CLASSES TABLE
-- =====================================================
-- Migration 22 created consolidated policies (classes_*_policy)
-- Migration 24 added duplicate admin policies
-- Migration 30 added a "Students can view their classes" policy

DROP POLICY IF EXISTS "Admins can view all classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Students can view their classes" ON public.classes;

-- =====================================================
-- PART 3: REMOVE DUPLICATE POLICIES ON PRIVATE_LESSON_REQUESTS
-- =====================================================
-- Migration 22 created consolidated policies (private_lesson_requests_*_policy)
-- The old "Admins can manage all lesson requests" and
-- "Instructors can manage all requests" policies still exist

DROP POLICY IF EXISTS "Admins can manage all lesson requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can manage all requests" ON public.private_lesson_requests;

-- =====================================================
-- PART 4: UPDATE CONSOLIDATED POLICIES TO USE (SELECT auth.uid())
-- AND INTEGRATE STUDENT CLASS VIEWING FUNCTIONALITY
-- =====================================================

-- First, drop the existing function (required because we can't change parameter names)
DROP FUNCTION IF EXISTS can_user_view_class(UUID, UUID);

-- Recreate the can_user_view_class function
CREATE OR REPLACE FUNCTION can_user_view_class(p_class_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if class is linked to user's lesson request
  IF EXISTS (
    SELECT 1 FROM private_lesson_requests plr
    JOIN students s ON s.id = plr.student_id
    WHERE plr.scheduled_class_id = p_class_id
    AND (s.profile_id = p_user_id OR s.guardian_id = p_user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is enrolled in the class
  IF EXISTS (
    SELECT 1 FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.class_id = p_class_id
    AND (s.profile_id = p_user_id OR s.guardian_id = p_user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Now recreate the consolidated SELECT policy for classes to include student access
DROP POLICY IF EXISTS "classes_select_policy" ON public.classes;
CREATE POLICY "classes_select_policy" ON public.classes
  FOR SELECT USING (
    -- Public classes visible to everyone
    is_public = true
    OR
    -- Instructors can see their own classes
    instructor_id = (SELECT auth.uid())
    OR
    -- Students can view classes they're enrolled in or have lesson requests for
    can_user_view_class(id, (SELECT auth.uid()))
    OR
    -- All instructors can see all classes
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can see all classes
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Recreate students_select_policy (it already uses SELECT auth.uid(), just ensuring consistency)
DROP POLICY IF EXISTS "students_select_policy" ON public.students;
CREATE POLICY "students_select_policy" ON public.students
  FOR SELECT USING (
    -- Students can view their own record
    profile_id = (SELECT auth.uid())
    OR
    -- Guardians can view their students
    guardian_id = (SELECT auth.uid())
    OR
    -- Instructors can view all students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- PART 5: REMOVE DUPLICATE INDEX ON ENROLLMENTS
-- =====================================================
-- Migration 29 created idx_enrollments_class_id which duplicates
-- the original idx_enrollments_class from supabase-schema.sql

DROP INDEX IF EXISTS idx_enrollments_class_id;

-- =====================================================
-- PART 6: ADD DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "classes_select_policy" ON public.classes IS
  'Consolidated SELECT policy: public classes visible to all, students can view enrolled/requested classes, instructors see own, admins see all. Optimized with (SELECT auth.uid()).';

COMMENT ON POLICY "students_select_policy" ON public.students IS
  'Consolidated SELECT policy: students see own, guardians see wards, instructors/admins see all. Optimized with (SELECT auth.uid()).';

COMMENT ON TABLE public.students IS
  'Student roster. RLS policies consolidated and optimized for performance using (SELECT auth.uid()) pattern.';

COMMENT ON TABLE public.classes IS
  'Class schedules. RLS policies consolidated and optimized for performance using (SELECT auth.uid()) pattern.';

COMMENT ON TABLE public.private_lesson_requests IS
  'Private lesson requests. RLS policies consolidated and optimized for performance using (SELECT auth.uid()) pattern.';
