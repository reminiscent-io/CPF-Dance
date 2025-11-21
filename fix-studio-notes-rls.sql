-- Fix RLS policies for notes table to allow studio role to view shared notes
-- This allows studio admins to see notes with shared_with_studio visibility

-- Add policy for studio users to view notes shared with studio
CREATE POLICY "Studio users can view notes shared with studio"
  ON notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'studio'
      AND notes.visibility = 'shared_with_studio'
    )
  );

-- Verify the existing policy for instructors and admins is correct
-- This should already exist but we'll recreate it to be sure
DROP POLICY IF EXISTS "Instructors and Admins can manage all notes" ON notes;

CREATE POLICY "Instructors and Admins can manage all notes"
  ON notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('instructor', 'admin')
    )
  );
