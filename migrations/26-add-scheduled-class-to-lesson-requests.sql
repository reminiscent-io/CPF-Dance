-- Migration: Add scheduled_class_id and instructor_id to private_lesson_requests
-- This allows linking a private lesson request to both the instructor and the class created from it

-- Add the instructor_id column (to track which instructor this request is for)
ALTER TABLE private_lesson_requests
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add the scheduled_class_id column (to link to the class created from this request)
ALTER TABLE private_lesson_requests
ADD COLUMN IF NOT EXISTS scheduled_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_lesson_requests_instructor_id
  ON private_lesson_requests(instructor_id);

CREATE INDEX IF NOT EXISTS idx_private_lesson_requests_scheduled_class_id
  ON private_lesson_requests(scheduled_class_id);

-- Add comments for documentation
COMMENT ON COLUMN private_lesson_requests.instructor_id IS 'The instructor this lesson request is directed to';
COMMENT ON COLUMN private_lesson_requests.scheduled_class_id IS 'Links to the class created from this lesson request';
