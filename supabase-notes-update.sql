-- Add personal_class_id column to notes table
-- This allows notes to be linked to personal classes as well as enrolled classes
-- Run this in your Supabase SQL Editor

-- Add the new column
ALTER TABLE notes
ADD COLUMN personal_class_id UUID REFERENCES personal_classes(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_notes_personal_class ON notes(personal_class_id);

-- The existing RLS policies should already cover this new field
-- since they check based on student_id and author_id, not the class reference
