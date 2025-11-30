-- Fix Notes RLS to prevent instructors from seeing all notes
-- Instructors should only see notes for students they teach

-- Drop the overly permissive "Instructors can manage all notes" policy
DROP POLICY IF EXISTS "Instructors can manage all notes" ON notes;

-- Create a new restrictive policy for instructor note management
-- Instructors can only manage notes for their own students or notes they authored
CREATE POLICY "Instructors can manage their student notes"
  ON notes
  FOR ALL
  USING (
    (author_id = auth.uid()) 
    OR 
    (
      EXISTS (
        SELECT 1 FROM instructor_student_relationships isr
        WHERE isr.instructor_id = auth.uid() 
        AND isr.student_id = notes.student_id 
        AND isr.relationship_status = 'active'
      )
    )
  )
  WITH CHECK (
    (author_id = auth.uid()) 
    OR 
    (
      EXISTS (
        SELECT 1 FROM instructor_student_relationships isr
        WHERE isr.instructor_id = auth.uid() 
        AND isr.student_id = notes.student_id 
        AND isr.relationship_status = 'active'
      )
    )
  );

-- Ensure the select policy for instructors is clear and doesn't have conflicts
-- Keep the specific "Instructors can view all notes" for clarity (but it's now restricted by the above)
-- Actually, let's also verify the instructor_student_relationships visibility
-- Make sure instructors can only see notes for their active relationships
