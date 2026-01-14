-- Migration: Consolidate Multiple Permissive RLS Policies
-- Description: Combines multiple permissive policies per table/action into single policies
-- This fixes the "multiple_permissive_policies" linter warnings for better performance
-- Each policy is evaluated for every query, so consolidating them improves performance

-- =====================================================
-- CLASSES TABLE
-- =====================================================

-- Drop all existing policies on classes
DROP POLICY IF EXISTS "Admins can delete classes" ON public.classes;
DROP POLICY IF EXISTS "Instructors can manage their classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can create classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON public.classes;
DROP POLICY IF EXISTS "Dancers can view public classes" ON public.classes;
DROP POLICY IF EXISTS "Everyone can view active classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can update all classes" ON public.classes;

-- Consolidated SELECT policy for classes
CREATE POLICY "classes_select_policy" ON public.classes
  FOR SELECT USING (
    -- Public classes visible to everyone
    is_public = true
    OR
    -- Instructors can see their own classes
    instructor_id = (SELECT auth.uid())
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

-- Consolidated INSERT policy for classes
CREATE POLICY "classes_insert_policy" ON public.classes
  FOR INSERT WITH CHECK (
    -- Instructors can create their own classes
    (
      instructor_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'instructor'
      )
    )
    OR
    -- Admins can create any class
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated UPDATE policy for classes
CREATE POLICY "classes_update_policy" ON public.classes
  FOR UPDATE USING (
    -- Instructors can update their own classes
    instructor_id = (SELECT auth.uid())
    OR
    -- Admins can update any class
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy for classes
CREATE POLICY "classes_delete_policy" ON public.classes
  FOR DELETE USING (
    -- Instructors can delete their own classes
    instructor_id = (SELECT auth.uid())
    OR
    -- Admins can delete any class
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- ENROLLMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can delete their class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can manage their class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can self-enroll" ON public.enrollments;
DROP POLICY IF EXISTS "Admins can view all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can view their class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Students can view their enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can update their class enrollments" ON public.enrollments;

-- Consolidated SELECT policy for enrollments
CREATE POLICY "enrollments_select_policy" ON public.enrollments
  FOR SELECT USING (
    -- Students can view their own enrollments
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = enrollments.student_id
      AND students.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can view enrollments for their classes
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can view all enrollments
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all enrollments
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy for enrollments
CREATE POLICY "enrollments_insert_policy" ON public.enrollments
  FOR INSERT WITH CHECK (
    -- Students can self-enroll
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = enrollments.student_id
      AND students.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can enroll students in their classes
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = (SELECT auth.uid())
    )
    OR
    -- Admins can manage all enrollments
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated UPDATE policy for enrollments
CREATE POLICY "enrollments_update_policy" ON public.enrollments
  FOR UPDATE USING (
    -- Instructors can update their class enrollments
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = (SELECT auth.uid())
    )
    OR
    -- Admins can update all enrollments
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy for enrollments
CREATE POLICY "enrollments_delete_policy" ON public.enrollments
  FOR DELETE USING (
    -- Instructors can delete their class enrollments
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = (SELECT auth.uid())
    )
    OR
    -- Admins can delete all enrollments
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- INSTRUCTOR_STUDENT_RELATIONSHIPS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins and instructors can manage relationships" ON public.instructor_student_relationships;
DROP POLICY IF EXISTS "Admins can create relationships" ON public.instructor_student_relationships;
DROP POLICY IF EXISTS "Instructors can create relationships" ON public.instructor_student_relationships;
DROP POLICY IF EXISTS "Dancers can view their relationships" ON public.instructor_student_relationships;
DROP POLICY IF EXISTS "Instructors can view their own relationships" ON public.instructor_student_relationships;
DROP POLICY IF EXISTS "Admins can update relationships" ON public.instructor_student_relationships;
DROP POLICY IF EXISTS "Admins can delete relationships" ON public.instructor_student_relationships;

-- Consolidated SELECT policy
CREATE POLICY "relationships_select_policy" ON public.instructor_student_relationships
  FOR SELECT USING (
    -- Instructors can view their own relationships
    instructor_id = (SELECT auth.uid())
    OR
    -- Dancers can view relationships where they are the student
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = instructor_student_relationships.student_id
      AND students.profile_id = (SELECT auth.uid())
    )
    OR
    -- Admins can view all relationships
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy
CREATE POLICY "relationships_insert_policy" ON public.instructor_student_relationships
  FOR INSERT WITH CHECK (
    -- Instructors can create relationships for themselves
    (
      instructor_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'instructor'
      )
    )
    OR
    -- Admins can create any relationship
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated UPDATE policy
CREATE POLICY "relationships_update_policy" ON public.instructor_student_relationships
  FOR UPDATE USING (
    -- Instructors can update their own relationships
    instructor_id = (SELECT auth.uid())
    OR
    -- Admins can update any relationship
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy
CREATE POLICY "relationships_delete_policy" ON public.instructor_student_relationships
  FOR DELETE USING (
    -- Instructors can delete their own relationships
    instructor_id = (SELECT auth.uid())
    OR
    -- Admins can delete any relationship
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- LESSON_PACK_PURCHASES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Instructors can view all purchases" ON public.lesson_pack_purchases;
DROP POLICY IF EXISTS "Students can view their own purchases" ON public.lesson_pack_purchases;

-- Consolidated SELECT policy
CREATE POLICY "lesson_pack_purchases_select_policy" ON public.lesson_pack_purchases
  FOR SELECT USING (
    -- Students can view their own purchases
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = lesson_pack_purchases.student_id
      AND students.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can view all purchases
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all purchases
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- LESSON_PACK_USAGE TABLE
-- =====================================================

DROP POLICY IF EXISTS "Instructors can manage usage" ON public.lesson_pack_usage;
DROP POLICY IF EXISTS "Students can create usage records" ON public.lesson_pack_usage;
DROP POLICY IF EXISTS "Students can view their usage" ON public.lesson_pack_usage;

-- Consolidated SELECT policy
CREATE POLICY "lesson_pack_usage_select_policy" ON public.lesson_pack_usage
  FOR SELECT USING (
    -- Students can view their own usage
    EXISTS (
      SELECT 1 FROM public.lesson_pack_purchases lpp
      JOIN public.students s ON s.id = lpp.student_id
      WHERE lpp.id = lesson_pack_usage.lesson_pack_purchase_id
      AND s.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can view all usage
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all usage
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy
CREATE POLICY "lesson_pack_usage_insert_policy" ON public.lesson_pack_usage
  FOR INSERT WITH CHECK (
    -- Students can create usage records for their purchases
    EXISTS (
      SELECT 1 FROM public.lesson_pack_purchases lpp
      JOIN public.students s ON s.id = lpp.student_id
      WHERE lpp.id = lesson_pack_usage.lesson_pack_purchase_id
      AND s.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can create usage records
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can create usage records
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- LESSON_PACKS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage lesson packs" ON public.lesson_packs;
DROP POLICY IF EXISTS "Everyone can view active lesson packs" ON public.lesson_packs;

-- Consolidated SELECT policy
CREATE POLICY "lesson_packs_select_policy" ON public.lesson_packs
  FOR SELECT USING (
    -- Everyone can view active lesson packs
    is_active = true
    OR
    -- Admins can view all lesson packs
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- NOTES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all notes" ON public.notes;
DROP POLICY IF EXISTS "Instructors can manage notes" ON public.notes;
DROP POLICY IF EXISTS "Instructors can manage their student notes" ON public.notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON public.notes;
DROP POLICY IF EXISTS "Instructors can view all notes" ON public.notes;
DROP POLICY IF EXISTS "Students can view shared notes about them" ON public.notes;
DROP POLICY IF EXISTS "Students can view their notes" ON public.notes;
DROP POLICY IF EXISTS "Students can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Studio users can view notes shared with studio" ON public.notes;
DROP POLICY IF EXISTS "Instructors can create notes for their students" ON public.notes;
DROP POLICY IF EXISTS "Students can create self notes" ON public.notes;

-- Consolidated SELECT policy for notes
CREATE POLICY "notes_select_policy" ON public.notes
  FOR SELECT USING (
    -- Author can always see their own notes
    author_id = (SELECT auth.uid())
    OR
    -- Students can view notes shared with them
    (
      visibility IN ('shared_with_student', 'shared_with_guardian')
      AND EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = notes.student_id
        AND (students.profile_id = (SELECT auth.uid()) OR students.guardian_id = (SELECT auth.uid()))
      )
    )
    OR
    -- Instructors can view notes for students they have relationships with
    EXISTS (
      SELECT 1 FROM public.instructor_student_relationships isr
      WHERE isr.instructor_id = (SELECT auth.uid())
      AND isr.student_id = notes.student_id
      AND isr.relationship_status = 'active'
    )
    OR
    -- Instructors can view all notes (general access)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all notes
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy for notes
CREATE POLICY "notes_insert_policy" ON public.notes
  FOR INSERT WITH CHECK (
    -- Users can only create notes as themselves
    author_id = (SELECT auth.uid())
    AND (
      -- Students can create notes for themselves
      EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = notes.student_id
        AND students.profile_id = (SELECT auth.uid())
      )
      OR
      -- Instructors can create notes for their students
      EXISTS (
        SELECT 1 FROM public.instructor_student_relationships isr
        WHERE isr.instructor_id = (SELECT auth.uid())
        AND isr.student_id = notes.student_id
        AND isr.relationship_status = 'active'
      )
      OR
      -- Instructors can create notes for any student
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'instructor'
      )
      OR
      -- Admins can create notes
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
      )
    )
  );

-- Consolidated UPDATE policy for notes
CREATE POLICY "notes_update_policy" ON public.notes
  FOR UPDATE USING (
    -- Authors can update their own notes
    author_id = (SELECT auth.uid())
    OR
    -- Admins can update any note
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy for notes
CREATE POLICY "notes_delete_policy" ON public.notes
  FOR DELETE USING (
    -- Authors can delete their own notes
    author_id = (SELECT auth.uid())
    OR
    -- Admins can delete any note
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- PAYMENT_EVENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can create payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Admins can manage payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Instructors can create payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Admins can view all payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Instructors can view payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Instructors can view student payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Students can view their payment events" ON public.payment_events;
DROP POLICY IF EXISTS "Studio admins can view studio payment events" ON public.payment_events;

-- Consolidated SELECT policy
CREATE POLICY "payment_events_select_policy" ON public.payment_events
  FOR SELECT USING (
    -- Students can view their own payment events (via payments table)
    EXISTS (
      SELECT 1 FROM public.payments p
      JOIN public.students s ON s.id = p.student_id
      WHERE p.id = payment_events.payment_id
      AND s.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can view all payment events
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all payment events
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy
CREATE POLICY "payment_events_insert_policy" ON public.payment_events
  FOR INSERT WITH CHECK (
    -- Instructors can create payment events
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can create payment events
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- PRIVATE_LESSON_REQUESTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all private lesson requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Admins can manage requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can manage requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can manage their requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Students can create requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Instructors can view requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Students can view their own requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Students can view their requests" ON public.private_lesson_requests;
DROP POLICY IF EXISTS "Students can update their requests" ON public.private_lesson_requests;

-- Consolidated SELECT policy
CREATE POLICY "private_lesson_requests_select_policy" ON public.private_lesson_requests
  FOR SELECT USING (
    -- Students can view their own requests
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = private_lesson_requests.student_id
      AND students.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can view all requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy
CREATE POLICY "private_lesson_requests_insert_policy" ON public.private_lesson_requests
  FOR INSERT WITH CHECK (
    -- Students can create requests for themselves
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = private_lesson_requests.student_id
      AND students.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can create requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can create requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated UPDATE policy
CREATE POLICY "private_lesson_requests_update_policy" ON public.private_lesson_requests
  FOR UPDATE USING (
    -- Students can update their own requests
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = private_lesson_requests.student_id
      AND students.profile_id = (SELECT auth.uid())
    )
    OR
    -- Instructors can update all requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can update all requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy
CREATE POLICY "private_lesson_requests_delete_policy" ON public.private_lesson_requests
  FOR DELETE USING (
    -- Instructors can delete requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can delete all requests
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- STUDENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all students" ON public.students;
DROP POLICY IF EXISTS "Instructors can manage students" ON public.students;
DROP POLICY IF EXISTS "Instructors can create students" ON public.students;
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
DROP POLICY IF EXISTS "Dancers can view themselves" ON public.students;
DROP POLICY IF EXISTS "Instructors can view all students" ON public.students;
DROP POLICY IF EXISTS "Students can view their own student record" ON public.students;

-- Consolidated SELECT policy
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

-- Consolidated INSERT policy
CREATE POLICY "students_insert_policy" ON public.students
  FOR INSERT WITH CHECK (
    -- Instructors can create students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can create students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated UPDATE policy
CREATE POLICY "students_update_policy" ON public.students
  FOR UPDATE USING (
    -- Instructors can update students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can update students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy
CREATE POLICY "students_delete_policy" ON public.students
  FOR DELETE USING (
    -- Instructors can delete students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can delete students
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- STUDIO_INQUIRIES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can link inquiries to studios" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Admins can manage all inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Admins can manage all studio inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Admins can manage studio inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Anyone can create studio inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Public can create inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Admins can view all studio inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Admins can view studio inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Instructors can view studio inquiries" ON public.studio_inquiries;
DROP POLICY IF EXISTS "Studio can view their inquiries" ON public.studio_inquiries;

-- Consolidated SELECT policy
CREATE POLICY "studio_inquiries_select_policy" ON public.studio_inquiries
  FOR SELECT USING (
    -- Instructors can view all inquiries
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all inquiries
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy (allow public to create)
CREATE POLICY "studio_inquiries_insert_policy" ON public.studio_inquiries
  FOR INSERT WITH CHECK (true);

-- Consolidated UPDATE policy
CREATE POLICY "studio_inquiries_update_policy" ON public.studio_inquiries
  FOR UPDATE USING (
    -- Instructors can update inquiries
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can update inquiries
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy
CREATE POLICY "studio_inquiries_delete_policy" ON public.studio_inquiries
  FOR DELETE USING (
    -- Admins can delete inquiries
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- STUDIOS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage all studios" ON public.studios;
DROP POLICY IF EXISTS "Admins can manage studios" ON public.studios;
DROP POLICY IF EXISTS "Instructors can create studios" ON public.studios;
DROP POLICY IF EXISTS "Admins can view all studios" ON public.studios;
DROP POLICY IF EXISTS "Instructors can view all studios" ON public.studios;
DROP POLICY IF EXISTS "Public can view studios" ON public.studios;
DROP POLICY IF EXISTS "Instructors can update studios" ON public.studios;

-- Consolidated SELECT policy
CREATE POLICY "studios_select_policy" ON public.studios
  FOR SELECT USING (true);  -- Public can view all studios

-- Consolidated INSERT policy
CREATE POLICY "studios_insert_policy" ON public.studios
  FOR INSERT WITH CHECK (
    -- Instructors can create studios
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can create studios
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated UPDATE policy
CREATE POLICY "studios_update_policy" ON public.studios
  FOR UPDATE USING (
    -- Instructors can update studios
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can update studios
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy
CREATE POLICY "studios_delete_policy" ON public.studios
  FOR DELETE USING (
    -- Admins can delete studios
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- WAIVER_TEMPLATES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Instructors and admins can create templates" ON public.waiver_templates;
DROP POLICY IF EXISTS "Users can delete their own templates" ON public.waiver_templates;
DROP POLICY IF EXISTS "Users can view their templates or shared templates" ON public.waiver_templates;
DROP POLICY IF EXISTS "Users can update their own templates" ON public.waiver_templates;

-- Consolidated SELECT policy
CREATE POLICY "waiver_templates_select_policy" ON public.waiver_templates
  FOR SELECT USING (
    -- Users can view their own templates
    created_by_id = (SELECT auth.uid())
    OR
    -- Instructors can view all templates
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'instructor'
    )
    OR
    -- Admins can view all templates
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated INSERT policy
CREATE POLICY "waiver_templates_insert_policy" ON public.waiver_templates
  FOR INSERT WITH CHECK (
    -- Must be creating as yourself
    created_by_id = (SELECT auth.uid())
    AND (
      -- Instructors can create templates
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'instructor'
      )
      OR
      -- Admins can create templates
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
      )
    )
  );

-- Consolidated UPDATE policy
CREATE POLICY "waiver_templates_update_policy" ON public.waiver_templates
  FOR UPDATE USING (
    -- Users can update their own templates
    created_by_id = (SELECT auth.uid())
    OR
    -- Admins can update any template
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- Consolidated DELETE policy
CREATE POLICY "waiver_templates_delete_policy" ON public.waiver_templates
  FOR DELETE USING (
    -- Users can delete their own templates
    created_by_id = (SELECT auth.uid())
    OR
    -- Admins can delete any template
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- =====================================================
-- REMOVE DUPLICATE INDEXES
-- =====================================================

-- Drop duplicate indexes on instructor_student_relationships
DROP INDEX IF EXISTS idx_relationships_instructor;
DROP INDEX IF EXISTS idx_relationships_student;
DROP INDEX IF EXISTS idx_relationships_status;

-- Keep the more descriptive indexes:
-- - idx_instructor_student_relationships_instructor
-- - idx_instructor_student_relationships_student
-- - idx_instructor_student_relationships_status

-- =====================================================
-- ADD COMMENTS
-- =====================================================

COMMENT ON POLICY "classes_select_policy" ON public.classes IS 'Consolidated SELECT policy: public/active classes visible to all, instructors see own, admins see all';
COMMENT ON POLICY "enrollments_select_policy" ON public.enrollments IS 'Consolidated SELECT policy: students see own, instructors see class enrollments, admins see all';
COMMENT ON POLICY "notes_select_policy" ON public.notes IS 'Consolidated SELECT policy: authors see own, students see shared, instructors see related, admins see all';
COMMENT ON POLICY "students_select_policy" ON public.students IS 'Consolidated SELECT policy: students see own, guardians see wards, instructors/admins see all';
