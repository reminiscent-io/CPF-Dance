-- Fix RLS policies for instructor_student_relationships table
-- This allows admins to create, read, update, and delete instructor-student relationships

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS instructor_student_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  relationship_status TEXT DEFAULT 'active',
  can_view_notes BOOLEAN DEFAULT true,
  can_view_progress BOOLEAN DEFAULT true,
  can_view_payments BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instructor_id, student_id)
);

-- Enable RLS
ALTER TABLE instructor_student_relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage all relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Instructors can view their relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Dancers can view their relationships" ON instructor_student_relationships;
DROP POLICY IF EXISTS "Admins and instructors can manage relationships" ON instructor_student_relationships;

-- Allow admins and instructors to manage relationships
-- Using the same pattern as other tables in the schema
CREATE POLICY "Admins and instructors can manage relationships"
  ON instructor_student_relationships
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'instructor')
    )
  );

-- Allow dancers to view relationships where they are the student
CREATE POLICY "Dancers can view their relationships"
  ON instructor_student_relationships
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_instructor_student_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_instructor_student_relationships_updated_at ON instructor_student_relationships;

CREATE TRIGGER update_instructor_student_relationships_updated_at
  BEFORE UPDATE ON instructor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_student_relationships_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructor_student_relationships_instructor
  ON instructor_student_relationships(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_student_relationships_student
  ON instructor_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_instructor_student_relationships_status
  ON instructor_student_relationships(relationship_status);
