-- Migration: Add assets table for promotional images and PDFs
-- Description: Creates a table to store metadata for uploaded assets (images, PDFs)
-- Date: 2024-12-19

-- Create assets table
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view all assets
CREATE POLICY "Authenticated users can view all assets"
  ON assets
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Instructors can insert their own assets
CREATE POLICY "Instructors can insert their own assets"
  ON assets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = instructor_id
    AND auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('instructor', 'admin')
    )
  );

-- Policy: Instructors can update their own assets
CREATE POLICY "Instructors can update their own assets"
  ON assets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = instructor_id
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Policy: Instructors can delete their own assets
CREATE POLICY "Instructors can delete their own assets"
  ON assets
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = instructor_id
    OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Add updated_at trigger
CREATE TRIGGER update_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add index for faster queries
CREATE INDEX idx_assets_instructor_id ON assets(instructor_id);
CREATE INDEX idx_assets_created_at ON assets(created_at DESC);
