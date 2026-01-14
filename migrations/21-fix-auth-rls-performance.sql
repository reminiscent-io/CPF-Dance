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

-- Note: Studio admin policies removed - studio portal was removed in migration 16
-- Drop legacy studio admin policies if they exist
DROP POLICY IF EXISTS "Studio admins can update their studio" ON public.studios;
DROP POLICY IF EXISTS "Studio admins can view studios" ON public.studios;

-- =====================================================
-- STUDENTS TABLE
-- =====================================================

-- Note: students table does not have instructor_id column
-- Instructors can manage ALL students (no per-instructor filtering)

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

-- Drop and recreate: Instructors can manage students (ALL operations)
DROP POLICY IF EXISTS "Instructors can manage students" ON public.students;
CREATE POLICY "Instructors can manage students" ON public.students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role = 'instructor'
    )
  );

-- Drop and recreate: Students can view their own student record
DROP POLICY IF EXISTS "Students can view their own student record" ON public.students;
CREATE POLICY "Students can view their own student record" ON public.students
  FOR SELECT USING (
    profile_id = (select auth.uid())
    OR guardian_id = (select auth.uid())
  );

-- Drop legacy policies if they exist
DROP POLICY IF EXISTS "Instructors can delete students" ON public.students;
DROP POLICY IF EXISTS "Instructors can update students" ON public.students;
DROP POLICY IF EXISTS "Instructors can view their students" ON public.students;
DROP POLICY IF EXISTS "Students can view themselves" ON public.students;

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
    issued_by_id = (select auth.uid())
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
    issued_by_id = (select auth.uid())
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
    -- User is instructor of the student (via relationship table)
    EXISTS (
      SELECT 1 FROM public.instructor_student_relationships
      WHERE instructor_student_relationships.student_id = waivers.student_id
      AND instructor_student_relationships.instructor_id = (select auth.uid())
      AND instructor_student_relationships.relationship_status = 'active'
    )
  );

-- =====================================================
-- WAIVER_TEMPLATES TABLE
-- =====================================================

-- Drop and recreate: Users can delete their own templates
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.waiver_templates;
CREATE POLICY "Users can delete their own templates" ON public.waiver_templates
  FOR DELETE USING (
    created_by_id = (select auth.uid())
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
