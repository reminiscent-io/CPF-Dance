-- Migration: Create instructor_student_relationships table
-- Description: Creates relationship table for controlling instructor access to student data
-- This table is used by the notes RLS policies to restrict which students an instructor can see
-- Date: 2024-12-01

-- Create instructor_student_relationships table
CREATE TABLE IF NOT EXISTS instructor_student_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationship participants
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Relationship status
  relationship_status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'

  -- Permission flags - what can the instructor view?
  can_view_notes BOOLEAN DEFAULT true,
  can_view_progress BOOLEAN DEFAULT true,
  can_view_payments BOOLEAN DEFAULT false,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one relationship per instructor-student pair
  UNIQUE(instructor_id, student_id)
);

-- Indexes for performance
CREATE INDEX idx_instructor_student_relationships_instructor ON instructor_student_relationships(instructor_id);
CREATE INDEX idx_instructor_student_relationships_student ON instructor_student_relationships(student_id);
CREATE INDEX idx_instructor_student_relationships_status ON instructor_student_relationships(relationship_status);

-- Enable RLS
ALTER TABLE instructor_student_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Instructors can view their own relationships
CREATE POLICY "Instructors can view their own relationships"
  ON instructor_student_relationships
  FOR SELECT
  USING (
    instructor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Students can view relationships where they are the student
CREATE POLICY "Students can view their relationships"
  ON instructor_student_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = instructor_student_relationships.student_id
      AND students.profile_id = auth.uid()
    )
  );

-- Only admins can create relationships (manual relationship management)
CREATE POLICY "Admins can create relationships"
  ON instructor_student_relationships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update relationships
CREATE POLICY "Admins can update relationships"
  ON instructor_student_relationships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete relationships
CREATE POLICY "Admins can delete relationships"
  ON instructor_student_relationships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_instructor_student_relationships_updated_at
  BEFORE UPDATE ON instructor_student_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE instructor_student_relationships IS
'Defines which instructors can access which students data. Used by RLS policies to restrict instructor access.';

COMMENT ON COLUMN instructor_student_relationships.can_view_notes IS
'Whether instructor can view notes for this student';

COMMENT ON COLUMN instructor_student_relationships.can_view_progress IS
'Whether instructor can view progress timeline for this student';

COMMENT ON COLUMN instructor_student_relationships.can_view_payments IS
'Whether instructor can view payment information for this student';
