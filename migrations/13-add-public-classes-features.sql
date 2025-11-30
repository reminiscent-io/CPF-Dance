-- Add public class features and external signup link

-- Add external_signup_url for classes booked outside the portal
ALTER TABLE classes
ADD COLUMN external_signup_url TEXT DEFAULT NULL;

-- Add is_public flag to allow classes to be visible to dancers/guardians
ALTER TABLE classes
ADD COLUMN is_public BOOLEAN DEFAULT false;

-- Add index for public classes queries
CREATE INDEX idx_classes_is_public ON classes(is_public);

-- Add comments
COMMENT ON COLUMN classes.external_signup_url IS
'External URL for class signup (e.g., Eventbrite, external booking system). When set, dancers are directed to this URL instead of internal enrollment.';

COMMENT ON COLUMN classes.is_public IS
'When true, class is visible to all dancers and guardians in their portal for enrollment. When false, class is only visible to instructor.';

-- Update RLS policies to allow dancers/guardians to view public classes
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Dancers can view public classes" ON classes;

-- Create policy for dancers to view public classes
CREATE POLICY "Dancers can view public classes"
  ON classes
  FOR SELECT
  USING (
    is_public = true
    OR instructor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'studio_admin')
    )
  );

-- Note: Existing instructor and admin policies should still work
-- This policy adds public visibility for dancers
