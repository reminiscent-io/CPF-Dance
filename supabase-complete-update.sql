-- Complete SQL Update for Personal Classes and Notes Class Tagging
-- Run this in your Supabase SQL Editor
-- This includes both the personal_classes table and the notes table update

-- ============================================================
-- PART 1: Create Personal Classes Table
-- ============================================================

CREATE TABLE personal_classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructor_name TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  notes TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_personal_classes_student ON personal_classes(student_id);
CREATE INDEX idx_personal_classes_start_time ON personal_classes(start_time);

-- Enable Row Level Security
ALTER TABLE personal_classes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_classes
CREATE POLICY "Students can view their own personal classes"
  ON personal_classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = personal_classes.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can create their own personal classes"
  ON personal_classes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = personal_classes.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can update their own personal classes"
  ON personal_classes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = personal_classes.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

CREATE POLICY "Students can delete their own personal classes"
  ON personal_classes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = personal_classes.student_id
      AND (students.profile_id = auth.uid() OR students.guardian_id = auth.uid())
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_personal_classes_updated_at BEFORE UPDATE ON personal_classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PART 2: Update Notes Table to Support Personal Classes
-- ============================================================

-- Add the new column to allow linking notes to personal classes
ALTER TABLE notes
ADD COLUMN personal_class_id UUID REFERENCES personal_classes(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_notes_personal_class ON notes(personal_class_id);

-- The existing RLS policies already cover this new field
-- since they check based on student_id and author_id, not the class reference

-- ============================================================
-- COMPLETED
-- ============================================================
-- Your database is now ready to:
-- 1. Track personal classes that dancers take outside the app
-- 2. Link notes to both enrolled classes and personal classes
