-- Migration: Backfill Instructor-Student Relationships
-- This populates the relationships table with existing instructor-student pairs from enrollments
-- Run this AFTER running 01-create-instructor-student-relationships.sql

-- ============================================================================
-- STEP 1: Backfill relationships from existing enrollments
-- ============================================================================

-- Insert unique instructor-student pairs from enrollments
INSERT INTO instructor_student_relationships (
  instructor_id,
  student_id,
  relationship_status,
  started_at,
  can_view_notes,
  can_view_progress,
  can_view_payments
)
SELECT DISTINCT
  c.instructor_id,
  e.student_id,
  'active' as relationship_status,
  MIN(e.enrolled_at) as started_at, -- Use earliest enrollment date
  true as can_view_notes, -- Default: instructors can view notes
  true as can_view_progress, -- Default: instructors can view progress
  false as can_view_payments -- Default: instructors cannot view payments (privacy)
FROM enrollments e
JOIN classes c ON e.class_id = c.id
WHERE c.instructor_id IS NOT NULL -- Only create relationships where instructor exists
GROUP BY c.instructor_id, e.student_id
ON CONFLICT (instructor_id, student_id) DO NOTHING; -- Skip if already exists

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the backfill worked:

-- 1. Count relationships created
-- SELECT COUNT(*) as total_relationships FROM instructor_student_relationships;

-- 2. See breakdown by instructor
-- SELECT
--   p.full_name as instructor_name,
--   COUNT(isr.id) as student_count
-- FROM instructor_student_relationships isr
-- JOIN profiles p ON p.id = isr.instructor_id
-- GROUP BY p.full_name
-- ORDER BY student_count DESC;

-- 3. See breakdown by student
-- SELECT
--   s.id,
--   COUNT(isr.id) as instructor_count
-- FROM students s
-- LEFT JOIN instructor_student_relationships isr ON s.id = isr.student_id
-- GROUP BY s.id
-- ORDER BY instructor_count DESC;

-- 4. Check for students without any instructor relationships (orphaned students)
-- SELECT
--   s.id,
--   p.full_name
-- FROM students s
-- JOIN profiles p ON s.profile_id = p.id
-- WHERE NOT EXISTS (
--   SELECT 1 FROM instructor_student_relationships
--   WHERE student_id = s.id
-- );

-- 5. Compare enrollment count vs relationship count (should match unique pairs)
-- SELECT
--   (SELECT COUNT(DISTINCT (c.instructor_id, e.student_id))
--    FROM enrollments e JOIN classes c ON e.class_id = c.id) as unique_enrollment_pairs,
--   (SELECT COUNT(*) FROM instructor_student_relationships) as relationship_count;

-- ============================================================================
-- CLEANUP (Optional)
-- ============================================================================

-- If you find orphaned or incorrect relationships, you can clean them up:

-- Remove relationships for students who are no longer enrolled in any classes
-- DELETE FROM instructor_student_relationships isr
-- WHERE NOT EXISTS (
--   SELECT 1 FROM enrollments e
--   JOIN classes c ON e.class_id = c.id
--   WHERE c.instructor_id = isr.instructor_id
--   AND e.student_id = isr.student_id
-- );

-- ============================================================================
-- NOTES
-- ============================================================================

-- After running this backfill:
-- 1. Verify the counts look reasonable (should match your enrollment data)
-- 2. Test that instructors can see their students in the app
-- 3. Students should be able to see their instructors
-- 4. New enrollments will automatically create relationships via the trigger
