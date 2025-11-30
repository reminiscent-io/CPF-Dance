-- Add student_id to waivers table to support issuing to students without auth accounts

-- Add student_id column to reference students directly
ALTER TABLE waivers ADD COLUMN student_id UUID REFERENCES students(id) ON DELETE CASCADE;

-- Make recipient_id nullable since we now support student_id as an alternative
ALTER TABLE waivers ALTER COLUMN recipient_id DROP NOT NULL;

-- Add check constraint to ensure either recipient_id OR student_id is set
ALTER TABLE waivers ADD CONSTRAINT waivers_recipient_check
  CHECK (
    (recipient_id IS NOT NULL AND student_id IS NULL)
    OR (recipient_id IS NULL AND student_id IS NOT NULL)
    OR (recipient_id IS NOT NULL AND student_id IS NOT NULL)
  );

-- Add index for student_id
CREATE INDEX idx_waivers_student ON waivers(student_id);

-- Update RLS policy to include student-based access
DROP POLICY IF EXISTS "Users can view waivers with proper access" ON waivers;

CREATE POLICY "Users can view waivers with proper access"
  ON waivers
  FOR SELECT
  USING (
    -- Issuer can view
    auth.uid() = issued_by_id
    -- Recipient (auth user) can view
    OR auth.uid() = recipient_id
    -- Signer can view
    OR auth.uid() = signed_by_id
    -- Student with auth account can view their waivers
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.id = waivers.student_id
      AND students.profile_id = auth.uid()
    )
    -- Admins can view all waivers
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    -- Guardian can view their student's waivers (via recipient_id)
    OR EXISTS (
      SELECT 1 FROM students
      JOIN profiles ON profiles.id = auth.uid()
      WHERE students.profile_id = waivers.recipient_id
      AND (
        students.guardian_id = auth.uid()
        OR profiles.guardian_id = auth.uid()
      )
    )
    -- Guardian can view their student's waivers (via student_id)
    OR EXISTS (
      SELECT 1 FROM students
      WHERE students.id = waivers.student_id
      AND (
        students.guardian_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = students.profile_id
          AND profiles.guardian_id = auth.uid()
        )
      )
    )
  );

COMMENT ON COLUMN waivers.student_id IS
'References student directly. Use this when issuing to students without auth accounts. Either recipient_id or student_id (or both) must be set.';

COMMENT ON COLUMN waivers.recipient_id IS
'References auth.users. Use this when issuing to users with auth accounts. Either recipient_id or student_id (or both) must be set.';
