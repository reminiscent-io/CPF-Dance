-- DATA MIGRATION SCRIPT: Consolidate Two Instructor Accounts
-- =============================================================
--
-- PURPOSE: Migrate all data from a source instructor profile to a target profile,
--          then link the source profile to the target profile for dual email login.
--
-- BEFORE RUNNING:
-- 1. Run the helper script to get actual profile IDs (see get-profile-ids.sql)
-- 2. Replace ALL placeholders below with actual UUIDs:
--    - {source_profile_id}     = Older/first email's profile.id
--    - {target_profile_id}     = Newer/second email's profile.id (primary)
--    - {source_auth_user_id}   = Older/first email's auth.users.id
--    - {target_auth_user_id}   = Newer/second email's auth.users.id
-- 3. BACKUP your database before running
-- 4. Test on a staging environment first if available
--
-- WHAT THIS SCRIPT DOES:
-- 1. Migrates all classes from source to target instructor
-- 2. Migrates all notes from source to target author
-- 3. Migrates all assets from source to target instructor
-- 4. Migrates all waiver templates to target creator
-- 5. Merges instructor-student relationships (handles duplicates)
-- 6. Migrates private lesson requests
-- 7. Migrates payment events
-- 8. Links source profile to target profile (enables dual email login)
-- 9. Provides verification queries to confirm migration success
--
-- =============================================================

-- STEP 1: Migrate Classes
-- Move all classes from source instructor to target instructor
UPDATE classes
SET instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- STEP 2: Migrate Notes
-- Move all notes authored by source to target
UPDATE notes
SET author_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE author_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- STEP 3: Migrate Assets (if assets table exists)
-- Move all assets from source to target
UPDATE assets
SET instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- STEP 4: Migrate Waiver Templates
-- Note: waiver_templates uses auth.users.id (not profile.id)
UPDATE waiver_templates
SET created_by_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE created_by_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- STEP 5: Merge Instructor-Student Relationships
-- First, identify and remove duplicate relationships
-- (where both source and target already have relationship with same student)
DELETE FROM instructor_student_relationships
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1'
  AND student_id IN (
    SELECT student_id
    FROM instructor_student_relationships
    WHERE instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
  );

-- Then migrate remaining unique relationships
UPDATE instructor_student_relationships
SET instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- STEP 6: Migrate Private Lesson Requests
UPDATE private_lesson_requests
SET instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- STEP 7: Migrate Payment Events (if applicable)
-- Update the actor_id for any payment events created by source instructor
UPDATE payment_events
SET actor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE actor_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- STEP 8: Link Source Profile to Target Profile
-- This enables dual email login - users signing in with either email
-- will have their operations directed to the target profile
UPDATE profiles
SET linked_profile_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'
WHERE id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- =============================================================
-- VERIFICATION QUERIES
-- Run these after migration to confirm success
-- =============================================================

-- All counts should be 0 (no data left under source profile)
SELECT
  'classes' as table_name,
  COUNT(*) as remaining_count
FROM classes
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1'

UNION ALL

SELECT
  'notes',
  COUNT(*)
FROM notes
WHERE author_id = '1554505e-686a-4390-944a-a2ee5e2490b1'

UNION ALL

SELECT
  'assets',
  COUNT(*)
FROM assets
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1'

UNION ALL

SELECT
  'waiver_templates',
  COUNT(*)
FROM waiver_templates
WHERE created_by_id = '1554505e-686a-4390-944a-a2ee5e2490b1'

UNION ALL

SELECT
  'instructor_student_relationships',
  COUNT(*)
FROM instructor_student_relationships
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1'

UNION ALL

SELECT
  'private_lesson_requests',
  COUNT(*)
FROM private_lesson_requests
WHERE instructor_id = '1554505e-686a-4390-944a-a2ee5e2490b1'

UNION ALL

SELECT
  'payment_events',
  COUNT(*)
FROM payment_events
WHERE actor_id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- Verify profile linking is set correctly
SELECT
  id,
  email,
  full_name,
  role,
  linked_profile_id,
  CASE
    WHEN linked_profile_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f' THEN '✓ Correctly linked'
    ELSE '✗ Incorrect link'
  END as link_status
FROM profiles
WHERE id = '1554505e-686a-4390-944a-a2ee5e2490b1';

-- View both profiles side-by-side
SELECT
  id,
  email,
  full_name,
  role,
  linked_profile_id,
  created_at,
  CASE
    WHEN id = '1554505e-686a-4390-944a-a2ee5e2490b1' THEN 'Source (Linked)'
    WHEN id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f' THEN 'Target (Primary)'
    ELSE 'Unknown'
  END as profile_type
FROM profiles
WHERE id IN ('1554505e-686a-4390-944a-a2ee5e2490b1', 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f')
ORDER BY created_at;

-- Count total data now under target profile
SELECT
  'classes' as table_name,
  COUNT(*) as total_count
FROM classes
WHERE instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'

UNION ALL

SELECT
  'notes',
  COUNT(*)
FROM notes
WHERE author_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'

UNION ALL

SELECT
  'assets',
  COUNT(*)
FROM assets
WHERE instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f'

UNION ALL

SELECT
  'instructor_student_relationships',
  COUNT(*)
FROM instructor_student_relationships
WHERE instructor_id = 'd8dd0e37-5bfb-4a8e-9193-6e02b2a8626f';

-- =============================================================
-- ROLLBACK SCRIPT (Save this in case you need to undo)
-- =============================================================
--
-- To rollback this migration:
--
-- 1. Remove the profile link:
-- UPDATE profiles SET linked_profile_id = NULL WHERE id = '1554505e-686a-4390-944a-a2ee5e2490b1';
--
-- 2. If you need to move data back, you would need to identify which records
--    were migrated (requires additional tracking before migration).
--    Consider creating a backup before running the migration.
--
-- =============================================================
