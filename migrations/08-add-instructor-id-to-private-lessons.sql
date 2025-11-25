-- Add instructor_id column to private_lesson_requests
ALTER TABLE private_lesson_requests 
ADD COLUMN instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_private_lesson_requests_instructor ON private_lesson_requests(instructor_id);
