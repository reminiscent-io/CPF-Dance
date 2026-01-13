-- Migration: Remove Duplicate Indexes
-- Description: Drop duplicate indexes on instructor_student_relationships table
-- Keeping the more descriptive index names and removing shorter versions

-- Drop duplicate indexes (keeping the more descriptive versions)
DROP INDEX IF EXISTS idx_relationships_instructor;
DROP INDEX IF EXISTS idx_relationships_student;
DROP INDEX IF EXISTS idx_relationships_status;

-- Verify the remaining indexes exist (no-op, just for documentation)
-- These indexes should remain:
-- - idx_instructor_student_relationships_instructor (on instructor_id)
-- - idx_instructor_student_relationships_student (on student_id)
-- - idx_instructor_student_relationships_status (on status)

-- Add comment documenting the cleanup
COMMENT ON TABLE public.instructor_student_relationships IS 'Tracks instructor-student relationships. Duplicate indexes removed for optimal performance.';
