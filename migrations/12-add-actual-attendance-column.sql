-- Add actual_attendance_count column to classes table
-- This allows instructors to override the enrollment count with actual attendance

ALTER TABLE classes
ADD COLUMN actual_attendance_count INTEGER DEFAULT NULL;

COMMENT ON COLUMN classes.actual_attendance_count IS 'Manual override for actual number of students who attended the class. If null, use enrollment count instead.';
