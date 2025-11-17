-- Personal Classes Table
-- Allows dancers to track classes they take outside the app
-- Run this in your Supabase SQL Editor

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

-- Create index for performance
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
