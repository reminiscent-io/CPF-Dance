-- Migration: Add scheduled_class_id to private_lesson_requests
-- This allows linking a private lesson request to the class created from it

-- Add the scheduled_class_id column
ALTER TABLE private_lesson_requests
ADD COLUMN IF NOT EXISTS scheduled_class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_private_lesson_requests_scheduled_class_id
  ON private_lesson_requests(scheduled_class_id);

-- Add comment for documentation
COMMENT ON COLUMN private_lesson_requests.scheduled_class_id IS 'Links to the class created from this lesson request';
