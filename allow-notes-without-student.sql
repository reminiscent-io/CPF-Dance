-- Allow notes to be created without a student record
-- This enables instructors to create notes for prospective students who haven't signed up yet

-- Step 1: Make student_id nullable in notes table
ALTER TABLE notes 
ALTER COLUMN student_id DROP NOT NULL;

-- Step 2: Update RLS policies to allow notes without student_id

-- Drop existing policies that reference student_id
DROP POLICY IF EXISTS "Instructors can create notes for their students" ON notes;
DROP POLICY IF EXISTS "Students can view their notes" ON notes;
DROP POLICY IF EXISTS "Students can view their own notes" ON notes;

-- Recreate policies to allow notes without student

-- Instructors can create notes (with or without student_id)
CREATE POLICY "Instructors can create notes for their students" ON notes
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND (
      -- Either no student specified (prospective student note)
      student_id IS NULL
      -- Or there's an active relationship with the student
      OR EXISTS (
        SELECT 1 FROM instructor_student_relationships
        WHERE instructor_student_relationships.student_id = notes.student_id
          AND instructor_student_relationships.instructor_id = auth.uid()
          AND instructor_student_relationships.relationship_status = 'active'
      )
    )
  );

-- Students can view notes about them that are shared
CREATE POLICY "Students can view their notes" ON notes
  FOR SELECT USING (
    author_id = auth.uid()
    OR (
      student_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = notes.student_id
          AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
          AND notes.visibility = ANY (ARRAY['shared_with_student'::note_visibility, 'shared_with_guardian'::note_visibility])
      )
    )
  );

-- Students can view their own notes (and notes without student_id are not visible to them)
CREATE POLICY "Students can view their own notes" ON notes
  FOR SELECT USING (
    author_id = auth.uid()
    OR (
      student_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = notes.student_id
          AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
      )
    )
  );
