-- Migration: Fix Auth RLS Performance Issues
-- Description: Optimize RLS policies by wrapping auth.uid() calls in subqueries
-- This prevents auth.uid() from being re-evaluated for each row

-- =====================================================
-- STUDIOS TABLE
-- =====================================================

-- Drop and recreate: Instructors can view all studios
DROP POLICY IF EXISTS "Instructors can view all studios" ON public.studios;
CREATE POLICY "Instructors can view all studios" ON public.studios
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'instructor'
    )
  );

-- Drop and recreate: Studio admins can update their studio
DROP POLICY IF EXISTS "Studio admins can update their studio" ON public.studios;
CREATE POLICY "Studio admins can update their studio" ON public.studios
  FOR UPDATE USING (
    studio_admin_id = (select auth.uid())
  );

-- Drop and recreate: Studio admins can view studios
DROP POLICY IF EXISTS "Studio admins can view studios" ON public.studios;
CREATE POLICY "Studio admins can view studios" ON public.studios
  FOR SELECT USING (
    studio_admin_id = (select auth.uid())
  );

-- =====================================================
-- STUDENTS TABLE
-- =====================================================

-- Drop and recreate: Instructors can delete students
DROP POLICY IF EXISTS "Instructors can delete students" ON public.students;
CREATE POLICY "Instructors can delete students" ON public.students
  FOR DELETE USING (
    instructor_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Drop and recreate: Instructors can update students
DROP POLICY IF EXISTS "Instructors can update students" ON public.students;
CREATE POLICY "Instructors can update students" ON public.students
  FOR UPDATE USING (
    instructor_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Drop and recreate: Instructors can view all students
DROP POLICY IF EXISTS "Instructors can view all students" ON public.students;
CREATE POLICY "Instructors can view all students" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'instructor'
    )
  );

-- Drop and recreate: Instructors can view their students
DROP POLICY IF EXISTS "Instructors can view their students" ON public.students;
CREATE POLICY "Instructors can view their students" ON public.students
  FOR SELECT USING (
    instructor_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Drop and recreate: Students can view themselves
DROP POLICY IF EXISTS "Students can view themselves" ON public.students;
CREATE POLICY "Students can view themselves" ON public.students
  FOR SELECT USING (
    profile_id = (select auth.uid())
  );

-- =====================================================
-- WAIVERS TABLE
-- =====================================================

-- Drop and recreate: Users can create waivers
DROP POLICY IF EXISTS "Users can create waivers" ON public.waivers;
CREATE POLICY "Users can create waivers" ON public.waivers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- Drop and recreate: Users can update waivers
DROP POLICY IF EXISTS "Users can update waivers" ON public.waivers;
CREATE POLICY "Users can update waivers" ON public.waivers
  FOR UPDATE USING (
    -- User is the issuer
    issued_by = (select auth.uid())
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
    OR
    -- User is the recipient (can only update signature fields)
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = waivers.student_id
      AND students.profile_id = (select auth.uid())
    )
  );

-- Drop and recreate: Users can view waivers with proper access
DROP POLICY IF EXISTS "Users can view waivers with proper access" ON public.waivers;
CREATE POLICY "Users can view waivers with proper access" ON public.waivers
  FOR SELECT USING (
    -- User is the issuer
    issued_by = (select auth.uid())
    OR
    -- User is admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
    OR
    -- User is the recipient student
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = waivers.student_id
      AND students.profile_id = (select auth.uid())
    )
    OR
    -- User is instructor of the student
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = waivers.student_id
      AND students.instructor_id = (select auth.uid())
    )
  );

-- =====================================================
-- WAIVER_TEMPLATES TABLE
-- =====================================================

-- Drop and recreate: Users can delete their own templates
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.waiver_templates;
CREATE POLICY "Users can delete their own templates" ON public.waiver_templates
  FOR DELETE USING (
    created_by = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Add comment documenting the optimization
COMMENT ON TABLE public.studios IS 'Studio location information. RLS policies optimized for performance using subqueries.';
COMMENT ON TABLE public.students IS 'Student roster. RLS policies optimized for performance using subqueries.';
COMMENT ON TABLE public.waivers IS 'Waiver instances. RLS policies optimized for performance using subqueries.';
COMMENT ON TABLE public.waiver_templates IS 'Reusable waiver templates. RLS policies optimized for performance using subqueries.';
