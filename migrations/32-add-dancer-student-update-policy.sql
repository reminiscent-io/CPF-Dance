-- Migration: Add UPDATE policy for dancers to update their own student record
-- This allows dancers to update their skill_level, goals, emergency contact info, etc.

-- Create policy for dancers to update their own student record
CREATE POLICY "Dancers can update their own student record"
  ON students FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Also allow guardians to update their linked student records
CREATE POLICY "Guardians can update their linked student records"
  ON students FOR UPDATE
  USING (guardian_id = auth.uid())
  WITH CHECK (guardian_id = auth.uid());
