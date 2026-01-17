-- HELPER SCRIPT: Get Profile IDs for Migration
-- ==============================================
--
-- PURPOSE: Retrieve the profile and auth user IDs needed for the data migration script
--
-- INSTRUCTIONS:
-- 1. Replace courtneyfile20@gmail.com and courtney@cpfdance.com with the actual email addresses
-- 2. Run this script in Supabase SQL Editor
-- 3. Copy the IDs from the results
-- 4. Use these IDs to replace placeholders in 16-migrate-instructor-data-TEMPLATE.sql
--
-- ==============================================

-- Get Profile IDs from profiles table
SELECT
  id as profile_id,
  email,
  full_name,
  role,
  created_at,
  CASE
    WHEN email = 'courtneyfile20@gmail.com' THEN 'SOURCE (older account)'
    WHEN email = 'courtney@cpfdance.com' THEN 'TARGET (newer/primary account)'
    ELSE 'unknown'
  END as account_type,
  CASE
    WHEN email = 'courtneyfile20@gmail.com' THEN 'Use as {source_profile_id}'
    WHEN email = 'courtney@cpfdance.com' THEN 'Use as {target_profile_id}'
    ELSE 'N/A'
  END as placeholder_name
FROM profiles
WHERE email IN ('courtneyfile20@gmail.com', 'courtney@cpfdance.com')
ORDER BY created_at;

-- Separator
SELECT '---' as separator, 'Auth User IDs (for waiver templates)' as note;

-- Get Auth User IDs from auth.users table
SELECT
  id as auth_user_id,
  email,
  created_at,
  CASE
    WHEN email = 'courtneyfile20@gmail.com' THEN 'SOURCE (older account)'
    WHEN email = 'courtney@cpfdance.com' THEN 'TARGET (newer/primary account)'
    ELSE 'unknown'
  END as account_type,
  CASE
    WHEN email = 'courtneyfile20@gmail.com' THEN 'Use as {source_auth_user_id}'
    WHEN email = 'courtney@cpfdance.com' THEN 'Use as {target_auth_user_id}'
    ELSE 'N/A'
  END as placeholder_name
FROM auth.users
WHERE email IN ('courtneyfile20@gmail.com', 'courtney@cpfdance.com')
ORDER BY created_at;

-- Separator
SELECT '---' as separator, 'Data Summary (before migration)' as note;

-- Count classes for both profiles
SELECT
  p.email,
  COUNT(c.id) as class_count
FROM profiles p
LEFT JOIN classes c ON c.instructor_id = p.id
WHERE p.email IN ('courtneyfile20@gmail.com', 'courtney@cpfdance.com')
GROUP BY p.email
ORDER BY p.email;

-- Count notes for both profiles
SELECT
  p.email,
  COUNT(n.id) as note_count
FROM profiles p
LEFT JOIN notes n ON n.author_id = p.id
WHERE p.email IN ('courtneyfile20@gmail.com', 'courtney@cpfdance.com')
GROUP BY p.email
ORDER BY p.email;

-- Count instructor-student relationships for both profiles
SELECT
  p.email,
  COUNT(r.id) as relationship_count
FROM profiles p
LEFT JOIN instructor_student_relationships r ON r.instructor_id = p.id
WHERE p.email IN ('courtneyfile20@gmail.com', 'courtney@cpfdance.com')
GROUP BY p.email
ORDER BY p.email;

-- Count private lesson requests for both profiles
SELECT
  p.email,
  COUNT(plr.id) as lesson_request_count
FROM profiles p
LEFT JOIN private_lesson_requests plr ON plr.instructor_id = p.id
WHERE p.email IN ('courtneyfile20@gmail.com', 'courtney@cpfdance.com')
GROUP BY p.email
ORDER BY p.email;

-- ==============================================
-- EXAMPLE OUTPUT:
-- ==============================================
-- Profile IDs:
-- profile_id                            | email                  | account_type              | placeholder_name
-- -------------------------------------|------------------------|---------------------------|----------------------------
-- abc123-def4-5678-90ab-cdef12345678   | old@example.com        | SOURCE (older account)    | Use as {source_profile_id}
-- xyz789-abc1-2345-67de-f890abc12345   | new@example.com        | TARGET (newer/primary)    | Use as {target_profile_id}
--
-- Auth User IDs:
-- auth_user_id                          | email                  | account_type              | placeholder_name
-- -------------------------------------|------------------------|---------------------------|--------------------------------
-- abc123-def4-5678-90ab-cdef12345678   | old@example.com        | SOURCE (older account)    | Use as {source_auth_user_id}
-- xyz789-abc1-2345-67de-f890abc12345   | new@example.com        | TARGET (newer/primary)    | Use as {target_auth_user_id}
-- ==============================================
