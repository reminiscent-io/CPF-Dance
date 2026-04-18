-- Migration 37: Extend notes_select_policy with shared_with_instructor
-- Context: Migration 22 set up notes_select_policy to admit
-- shared_with_student and shared_with_guardian for dancers viewing their
-- own notes. Migration 36 added 'shared_with_instructor' to the enum —
-- this migration updates the RLS SELECT policy to match the
-- `/api/dancer/notes` GET filter, which already includes that value.
--
-- Semantics: shared_with_instructor means "dancer wrote this for their
-- instructor's eyes only." The dancer who authored it should still be
-- able to read it back — the author_id branch already covers that, but
-- making the visibility-based branch inclusive keeps the policy and API
-- filter consistent.

DROP POLICY IF EXISTS "notes_select_policy" ON public.notes;

CREATE POLICY "notes_select_policy" ON public.notes
  FOR SELECT USING (
    -- Author can always see their own notes
    author_id = (SELECT auth.uid())
    OR
    -- Students (and their guardians) can view notes shared with them
    (
      visibility IN ('shared_with_student', 'shared_with_guardian', 'shared_with_instructor')
      AND EXISTS (
        SELECT 1 FROM public.students
        WHERE students.id = notes.student_id
        AND (students.profile_id = (SELECT auth.uid()) OR students.guardian_id = (SELECT auth.uid()))
      )
    )
    OR
    -- Instructors can view notes for students they have active relationships with
    EXISTS (
      SELECT 1 FROM public.instructor_student_relationships isr
      WHERE isr.instructor_id = (SELECT auth.uid())
      AND isr.student_id = notes.student_id
      AND isr.relationship_status = 'active'
    )
    OR
    -- Instructors can view all notes
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

COMMENT ON POLICY "notes_select_policy" ON public.notes IS
  'Consolidated SELECT policy: authors see own, students see shared (including instructor-directed notes they authored), instructors see related, admins see all';
