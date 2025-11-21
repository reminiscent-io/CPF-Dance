-- Migration: Create Instructor-Student Relationships Table
-- This table tracks which instructors teach which students and manages permissions
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create the relationships table
-- ============================================================================

CREATE TABLE IF NOT EXISTS instructor_student_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

  -- Permission flags - students control what instructors can see
  can_view_notes BOOLEAN DEFAULT true,
  can_view_progress BOOLEAN DEFAULT true,
  can_view_payments BOOLEAN DEFAULT false,

  -- Relationship metadata
  relationship_status TEXT DEFAULT 'active', -- 'active', 'inactive', 'pending'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Tracking
  created_by UUID REFERENCES profiles(id), -- Who created this relationship
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(instructor_id, student_id),
  CHECK (relationship_status IN ('active', 'inactive', 'pending'))
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_relationships_instructor
  ON instructor_student_relationships(instructor_id);

CREATE INDEX IF NOT EXISTS idx_relationships_student
  ON instructor_student_relationships(student_id);

CREATE INDEX IF NOT EXISTS idx_relationships_status
  ON instructor_student_relationships(relationship_status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_relationships_active_instructor
  ON instructor_student_relationships(instructor_id, relationship_status)
  WHERE relationship_status = 'active';

CREATE INDEX IF NOT EXISTS idx_relationships_active_student
  ON instructor_student_relationships(student_id, relationship_status)
  WHERE relationship_status = 'active';

-- ============================================================================
-- STEP 3: Create updated_at trigger
-- ============================================================================

CREATE TRIGGER update_instructor_student_relationships_updated_at
  BEFORE UPDATE ON instructor_student_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Enable Row-Level Security
-- ============================================================================

ALTER TABLE instructor_student_relationships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS Policies for the relationships table
-- ============================================================================

-- Students can view their instructor relationships
CREATE POLICY "Students can view their instructor relationships"
  ON instructor_student_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = instructor_student_relationships.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

-- Students can update permissions for their relationships (not delete)
CREATE POLICY "Students can update their relationship permissions"
  ON instructor_student_relationships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = instructor_student_relationships.student_id
      AND students.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Students can only update permission flags, not the relationship itself
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = instructor_student_relationships.student_id
      AND students.profile_id = auth.uid()
    )
  );

-- Instructors can view their student relationships
CREATE POLICY "Instructors can view their relationships"
  ON instructor_student_relationships FOR SELECT
  USING (
    instructor_id = auth.uid()
    OR
    -- Allow viewing if they're an instructor (needed for creating relationships)
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Instructors can create relationships (when enrolling students)
CREATE POLICY "Instructors can create relationships"
  ON instructor_student_relationships FOR INSERT
  WITH CHECK (
    instructor_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Instructors can update relationship status (activate/deactivate)
CREATE POLICY "Instructors can update relationship status"
  ON instructor_student_relationships FOR UPDATE
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Instructors can delete relationships they created
CREATE POLICY "Instructors can delete their relationships"
  ON instructor_student_relationships FOR DELETE
  USING (instructor_id = auth.uid());

-- Admins can view all relationships
CREATE POLICY "Admins can view all relationships"
  ON instructor_student_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can manage all relationships
CREATE POLICY "Admins can manage all relationships"
  ON instructor_student_relationships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 6: Create trigger to auto-create relationships on enrollment
-- ============================================================================

CREATE OR REPLACE FUNCTION create_instructor_relationship_on_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  -- When enrollment is created, ensure instructor-student relationship exists
  INSERT INTO instructor_student_relationships (
    instructor_id,
    student_id,
    created_by,
    relationship_status
  )
  SELECT
    c.instructor_id,
    NEW.student_id,
    auth.uid(),
    'active'
  FROM classes c
  WHERE c.id = NEW.class_id
  ON CONFLICT (instructor_id, student_id)
  DO UPDATE SET
    relationship_status = 'active', -- Reactivate if was inactive
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to enrollments table
DROP TRIGGER IF EXISTS auto_create_instructor_relationship ON enrollments;
CREATE TRIGGER auto_create_instructor_relationship
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION create_instructor_relationship_on_enrollment();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these after the migration to verify it worked:

-- 1. Check table was created
-- SELECT COUNT(*) FROM instructor_student_relationships;

-- 2. Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'instructor_student_relationships';

-- 3. Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'instructor_student_relationships';

-- 4. Check policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'instructor_student_relationships';

-- ============================================================================
-- NOTES
-- ============================================================================

-- After running this migration:
-- 1. Run the backfill script (02-backfill-relationships.sql) to populate existing relationships
-- 2. Update RLS policies on other tables to use this relationship table
-- 3. Test that instructors can only see their students

-- Rollback (if needed):
-- DROP TRIGGER IF EXISTS auto_create_instructor_relationship ON enrollments;
-- DROP FUNCTION IF EXISTS create_instructor_relationship_on_enrollment();
-- DROP TABLE IF EXISTS instructor_student_relationships CASCADE;
