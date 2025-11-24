-- Update waiver access control to include admins and guardians

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view waivers they issued or received" ON waivers;

-- Create updated policy with admin and guardian access
CREATE POLICY "Users can view waivers with proper access"
  ON waivers
  FOR SELECT
  USING (
    -- Issuer can view
    auth.uid() = issued_by_id
    -- Recipient can view
    OR auth.uid() = recipient_id
    -- Signer can view
    OR auth.uid() = signed_by_id
    -- Admins can view all waivers
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    -- Guardian can view their student's waivers
    OR EXISTS (
      SELECT 1 FROM students
      JOIN profiles ON profiles.id = auth.uid()
      WHERE students.profile_id = waivers.recipient_id
      AND (
        students.guardian_id = auth.uid()
        OR profiles.guardian_id = auth.uid()
      )
    )
  );

-- Update waiver signatures policy to include guardians
DROP POLICY IF EXISTS "Users can view waiver signatures" ON waiver_signatures;

CREATE POLICY "Users can view waiver signatures with proper access"
  ON waiver_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM waivers
      WHERE waivers.id = waiver_signatures.waiver_id
      AND (
        -- Issuer can view
        auth.uid() = waivers.issued_by_id
        -- Recipient can view
        OR auth.uid() = waivers.recipient_id
        -- Signer can view
        OR auth.uid() = waivers.signed_by_id
        -- Admins can view all
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
        -- Guardian can view
        OR EXISTS (
          SELECT 1 FROM students
          JOIN profiles ON profiles.id = auth.uid()
          WHERE students.profile_id = waivers.recipient_id
          AND (
            students.guardian_id = auth.uid()
            OR profiles.guardian_id = auth.uid()
          )
        )
      )
    )
  );

-- Also update the GET waiver API to ensure backend filtering
-- This is handled in the API routes, but let's add a comment for clarity

COMMENT ON POLICY "Users can view waivers with proper access" ON waivers IS
'Allows viewing waivers for: (1) Issuer (2) Recipient (3) Signer (4) Admins (5) Guardians of student recipients';
