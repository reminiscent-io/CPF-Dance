-- Add studio_id column to studio_inquiries table
-- This allows admins to link studio inquiries to specific studio records

ALTER TABLE studio_inquiries ADD COLUMN studio_id UUID REFERENCES studios(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_studio_inquiries_studio ON studio_inquiries(studio_id);

-- RLS Policy: Admins can update studio inquiries to link studios
CREATE POLICY "Admins can link inquiries to studios"
  ON studio_inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
