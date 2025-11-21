-- Migration: Update RLS Policies for Instructor-Student Relationships
-- This updates all table policies to use the new relationship-based security model
-- Run this AFTER creating relationships table and backfilling data

-- IMPORTANT: This will drop and recreate policies. Test thoroughly after running!

-- ============================================================================
-- PROFILES TABLE - Restrict instructor access to related students only
-- ============================================================================

-- Drop old overly-permissive policy
DROP POLICY IF EXISTS "Instructors can view all profiles" ON profiles;

-- Instructors can view profiles of students they teach
CREATE POLICY "Instructors can view related student profiles"
  ON profiles FOR SELECT
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Profiles of students they have relationships with
    EXISTS (
      SELECT 1 FROM students s
      JOIN instructor_student_relationships isr ON s.id = isr.student_id
      WHERE s.profile_id = profiles.id
      AND isr.instructor_id = auth.uid()
      AND isr.relationship_status = 'active'
    )
    OR
    -- Other instructor profiles (for collaboration, viewing who teaches what)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'instructor'
      AND profiles.role IN ('instructor', 'admin')
    )
  );

-- Guardians can view their dancer profiles
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
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- STUDENTS TABLE - Restrict instructor access to their students only
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Instructors can view all students" ON students;
DROP POLICY IF EXISTS "Instructors can manage students" ON students;

-- Instructors can only view students they teach
CREATE POLICY "Instructors can view their students"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = students.id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
    )
  );

-- Instructors can create students (will establish relationship via trigger)
CREATE POLICY "Instructors can create students"
  ON students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Instructors can update their students
CREATE POLICY "Instructors can update their students"
  ON students FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = students.id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
    )
  );

-- Students can update their own record
CREATE POLICY "Students can update their own record"
  ON students FOR UPDATE
  USING (profile_id = auth.uid() OR guardian_id = auth.uid());

-- Admins can manage all students
CREATE POLICY "Admins can manage all students"
  ON students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- CLASSES TABLE - Students see enrolled classes, instructors see theirs
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Everyone can view active classes" ON classes;

-- Students can only view classes they're enrolled in
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
    -- Instructors see all active classes (for browsing/collaboration)
    (
      is_cancelled = false
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
      )
    )
    OR
    -- Admins see all classes
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    OR
    -- Studio admins see classes at their studio (TODO: needs studio linking)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'studio_admin'
    )
  );

-- Keep existing instructor management policy (already correct)
-- Instructors can manage their own classes via existing policy

-- ============================================================================
-- ENROLLMENTS TABLE - Restrict to instructor's classes only
-- ============================================================================

-- Drop old overly-permissive policies
DROP POLICY IF EXISTS "Instructors can view all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can manage enrollments" ON enrollments;

-- Instructors can only view enrollments for their classes
CREATE POLICY "Instructors can view their class enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
      AND classes.instructor_id = auth.uid()
    )
  );

-- Instructors can manage enrollments for their classes
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

-- Students can self-enroll in classes
CREATE POLICY "Students can self-enroll"
  ON enrollments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = enrollments.student_id
      AND students.profile_id = auth.uid()
    )
  );

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- NOTES TABLE - Complex visibility with relationship permissions
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "Students can view shared notes about them" ON notes;
DROP POLICY IF EXISTS "Instructors and Admins can manage all notes" ON notes;

-- Students can view notes based on visibility AND instructor relationship
CREATE POLICY "Students can view their notes"
  ON notes FOR SELECT
  USING (
    -- Own notes (private student notes)
    author_id = auth.uid()
    OR
    -- Notes about them with proper visibility and instructor relationship
    EXISTS (
      SELECT 1 FROM students s
      LEFT JOIN instructor_student_relationships isr
        ON s.id = isr.student_id
        AND isr.instructor_id = notes.author_id
        AND isr.relationship_status = 'active'
      WHERE s.id = notes.student_id
      AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
      AND (
        -- Shared notes from instructors they have relationships with who have permission
        (notes.visibility IN ('shared_with_student', 'shared_with_guardian')
         AND isr.can_view_notes = true)
        OR
        -- Notes they authored themselves
        notes.author_id = s.profile_id
      )
    )
  );

-- Students can create notes about themselves
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

-- Students can manage their own notes
CREATE POLICY "Students can manage own notes"
  ON notes FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Students can delete own notes"
  ON notes FOR DELETE
  USING (author_id = auth.uid());

-- Instructors can view notes for their students (respecting permissions)
CREATE POLICY "Instructors can view their student notes"
  ON notes FOR SELECT
  USING (
    -- Own notes
    author_id = auth.uid()
    OR
    -- Notes from students they teach who granted permission
    EXISTS (
      SELECT 1 FROM instructor_student_relationships isr
      WHERE isr.student_id = notes.student_id
      AND isr.instructor_id = auth.uid()
      AND isr.relationship_status = 'active'
      AND (
        -- Can view if student granted permission AND note isn't private
        (isr.can_view_notes = true AND notes.visibility != 'private')
        OR
        -- Can always see notes they authored
        notes.author_id = auth.uid()
      )
    )
  );

-- Instructors can create notes for their students
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

-- Instructors can update/delete their own notes
CREATE POLICY "Instructors can manage own notes"
  ON notes FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Instructors can delete own notes"
  ON notes FOR DELETE
  USING (author_id = auth.uid());

-- Admins can view all non-private notes
CREATE POLICY "Admins can view non-private notes"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
    AND (notes.visibility != 'private' OR notes.author_id = auth.uid())
  );

-- ============================================================================
-- PAYMENTS TABLE - Restrict to instructor's students
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Instructors can manage all payments" ON payments;

-- Instructors can only view payments for their students
CREATE POLICY "Instructors can view their student payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = payments.student_id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
      AND can_view_payments = true -- Student must grant payment viewing permission
    )
  );

-- Instructors can create/update payments for their students (if permitted)
CREATE POLICY "Instructors can manage their student payments"
  ON payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = payments.student_id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
    )
  );

CREATE POLICY "Instructors can update their student payments"
  ON payments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = payments.student_id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
    )
  );

-- Studio admins can view/manage studio payments (keep existing policy)
-- Admins can manage all payments (keep existing policy)

-- ============================================================================
-- PRIVATE_LESSON_REQUESTS TABLE - Restrict to instructor's students
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Instructors can manage all requests" ON private_lesson_requests;

-- Instructors can only view requests from their students
CREATE POLICY "Instructors can view their student requests"
  ON private_lesson_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = private_lesson_requests.student_id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
    )
  );

-- Instructors can update requests from their students
CREATE POLICY "Instructors can respond to their student requests"
  ON private_lesson_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM instructor_student_relationships
      WHERE instructor_student_relationships.student_id = private_lesson_requests.student_id
      AND instructor_student_relationships.instructor_id = auth.uid()
      AND relationship_status = 'active'
    )
  );

-- Students can update their own requests
CREATE POLICY "Students can update own requests"
  ON private_lesson_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
      AND students.profile_id = auth.uid()
    )
  );

-- Students can delete their own requests
CREATE POLICY "Students can delete own requests"
  ON private_lesson_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = private_lesson_requests.student_id
      AND students.profile_id = auth.uid()
    )
  );

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests"
  ON private_lesson_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify policies are working:

-- 1. Check all policies on each table
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- 2. Test as instructor - should only see related students
-- SELECT COUNT(*) FROM students; -- Should be limited count

-- 3. Test as student - should only see own data
-- SELECT COUNT(*) FROM notes; -- Should only see your notes

-- 4. Test as admin - should see everything (except private notes)
-- SELECT COUNT(*) FROM notes WHERE visibility != 'private'; -- Should see all non-private

-- ============================================================================
-- NOTES
-- ============================================================================

-- Key Changes:
-- 1. Instructors now filtered by instructor_student_relationships
-- 2. Notes respect both visibility AND relationship permissions
-- 3. Payments require explicit permission from students
-- 4. All queries use relationship_status = 'active'
-- 5. Admins can view everything except private student notes

-- After running this migration:
-- 1. Test instructor access - should be more restricted
-- 2. Test student privacy controls - should be able to manage permissions
-- 3. Test admin access - should see most things
-- 4. Monitor query performance (relationship JOINs may be slower)
