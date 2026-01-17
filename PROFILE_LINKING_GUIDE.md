# Profile Linking Migration Guide

## Overview

This guide walks you through enabling **dual email login** for an instructor account. After completion:
- ✅ Both email addresses will work for login
- ✅ All classes and data will be consolidated under one primary profile
- ✅ Regardless of which email is used to login, the user sees the same data

## What is Profile Linking?

Profile linking allows multiple Supabase auth accounts (with different emails) to share the same profile data. When a user signs in with a "linked" account, the system automatically redirects all operations to use the "primary" profile.

**Technical implementation:**
- Both auth.users accounts remain active (separate passwords)
- One profile becomes the "primary" profile (all data lives here)
- Other profile becomes "linked" via `linked_profile_id` column
- Middleware and auth layers handle the redirect transparently

## Prerequisites

Before starting:
1. **Backup your database** - Always have a recent backup
2. **Test on staging first** - If you have a staging environment, test there
3. **Know your email addresses** - Have both email addresses ready
4. **Supabase access** - SQL Editor access to your Supabase project

## Migration Steps

### Step 1: Apply Schema Migration

Apply the profile linking schema to add the `linked_profile_id` column.

**File:** `migrations/15-add-profile-linking.sql`

**Instructions:**
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `migrations/15-add-profile-linking.sql`
4. Paste into SQL Editor
5. Click "Run"

**What this does:**
- Adds `linked_profile_id` column to profiles table
- Creates index for performance
- Adds constraints to prevent circular linking
- Adds trigger to prevent self-linking

**Verification:**
```sql
-- Check that the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'linked_profile_id';
```

---

### Step 2: Deploy Code Changes

The code changes have already been made to support profile linking:
- ✅ `lib/auth/server-auth.ts` - Updated `getCurrentUserWithRole()`
- ✅ `lib/supabase/middleware.ts` - Updated `updateSession()`

**Instructions:**
1. Commit and push the changes (if using git)
2. Deploy to your environment (Replit, Vercel, etc.)
3. Wait for deployment to complete

**What these changes do:**
- When a user signs in, check if their profile has `linked_profile_id`
- If yes, fetch and use the primary profile instead
- All subsequent operations use the primary profile's ID

---

### Step 3: Get Profile IDs

Use the helper script to retrieve the UUIDs you'll need for migration.

**File:** `migrations/get-profile-ids.sql`

**Instructions:**
1. Open `migrations/get-profile-ids.sql`
2. Replace these placeholders with actual email addresses:
   - `{first_email}` → your older/first email address
   - `{second_email}` → your newer/second email address (will be primary)
3. Copy the modified script
4. Run in Supabase SQL Editor
5. **Copy the IDs from the results** - you'll need them in Step 4

**Example:**
```sql
-- Before:
WHERE email IN ('{first_email}', '{second_email}')

-- After:
WHERE email IN ('jane@oldemail.com', 'jane@newemail.com')
```

**Expected output:**
```
profile_id                            | email                | account_type           | placeholder_name
--------------------------------------|----------------------|------------------------|-------------------------
abc123...                             | jane@oldemail.com    | SOURCE (older)         | {source_profile_id}
xyz789...                             | jane@newemail.com    | TARGET (primary)       | {target_profile_id}

auth_user_id                          | email                | account_type           | placeholder_name
--------------------------------------|----------------------|------------------------|-------------------------
abc123...                             | jane@oldemail.com    | SOURCE (older)         | {source_auth_user_id}
xyz789...                             | jane@newemail.com    | TARGET (primary)       | {target_auth_user_id}
```

**Save these IDs** - you'll need all four in the next step.

---

### Step 4: Run Data Migration

Consolidate all data from the source profile to the target profile.

**File:** `migrations/16-migrate-instructor-data-TEMPLATE.sql`

**Instructions:**
1. **Create a backup** of your database (seriously!)
2. Open `migrations/16-migrate-instructor-data-TEMPLATE.sql`
3. Replace ALL placeholders with actual IDs from Step 3:
   - `{source_profile_id}` → profile ID from older email
   - `{target_profile_id}` → profile ID from newer email
   - `{source_auth_user_id}` → auth.users ID from older email
   - `{target_auth_user_id}` → auth.users ID from newer email
4. **Review the script carefully** - make sure all IDs are correct
5. Copy the modified script
6. Run in Supabase SQL Editor
7. **Check the verification queries at the end** - all "remaining_count" should be 0

**What this migration does:**
1. Migrates all classes → target instructor
2. Migrates all notes → target author
3. Migrates all assets → target instructor
4. Migrates all waiver templates → target creator
5. Merges instructor-student relationships (removes duplicates)
6. Migrates private lesson requests → target instructor
7. Migrates payment events → target actor
8. **Links source profile to target profile** (enables dual login)

**Important:** The script includes verification queries at the end. Run them and ensure:
- All "remaining_count" values are 0
- `linked_profile_id` is correctly set
- Target profile has all expected data

---

### Step 5: Test Dual Email Login

Verify that both email logins work correctly.

**Test checklist:**

1. **Sign out** completely
2. **Sign in with FIRST email** (older account)
   - ✅ Should successfully authenticate
   - ✅ Should redirect to instructor portal
   - ✅ Should see ALL classes (from both accounts)
   - ✅ Dashboard should show combined data
3. **Sign out**
4. **Sign in with SECOND email** (newer/primary account)
   - ✅ Should successfully authenticate
   - ✅ Should redirect to instructor portal
   - ✅ Should see same classes as step 2
   - ✅ Dashboard should show same data as step 2
5. **Create a new class** while signed in with first email
   - ✅ Class should be created
   - ✅ Check database - `instructor_id` should equal target profile ID (not source)
6. **Sign out and sign in with second email**
   - ✅ New class should be visible
7. **Create a new note** while signed in with first email
   - ✅ Note should be created
   - ✅ Check database - `author_id` should equal target profile ID
8. **Check that no errors appear** in browser console

---

### Step 6: Verify Data Integrity

Run additional checks to ensure everything migrated correctly.

**Verification queries:**

```sql
-- 1. Check that source profile is linked
SELECT id, email, full_name, linked_profile_id
FROM profiles
WHERE email = 'your-first-email@example.com';
-- linked_profile_id should NOT be null

-- 2. Check that target profile is NOT linked
SELECT id, email, full_name, linked_profile_id
FROM profiles
WHERE email = 'your-second-email@example.com';
-- linked_profile_id should be NULL

-- 3. Count classes under target profile
SELECT COUNT(*) as total_classes
FROM classes
WHERE instructor_id = 'your-target-profile-id';
-- Should equal total from both accounts

-- 4. Count classes under source profile (should be 0)
SELECT COUNT(*) as remaining_classes
FROM classes
WHERE instructor_id = 'your-source-profile-id';
-- Should be 0

-- 5. Check for any orphaned data
SELECT
  'classes' as table_name,
  COUNT(*) as count
FROM classes
WHERE instructor_id NOT IN (
  SELECT id FROM profiles
)
UNION ALL
SELECT
  'notes',
  COUNT(*)
FROM notes
WHERE author_id NOT IN (
  SELECT id FROM profiles
);
-- All counts should be 0
```

---

## Troubleshooting

### Issue: After login, I see "Unauthorized" error

**Possible causes:**
- Middleware not deployed yet
- Code changes not applied
- Browser cache issue

**Solutions:**
1. Clear browser cache and cookies
2. Verify code is deployed (check deployment logs)
3. Check browser console for errors
4. Restart development server (if in dev mode)

---

### Issue: I see data from the OLD account, not the combined data

**Possible causes:**
- Profile linking not set correctly
- Migration script didn't complete
- Code changes not deployed

**Solutions:**
1. Check `linked_profile_id` in database:
   ```sql
   SELECT id, email, linked_profile_id
   FROM profiles
   WHERE email IN ('email1@example.com', 'email2@example.com');
   ```
2. Verify migration ran successfully (check verification queries)
3. Ensure code is deployed with latest changes
4. Sign out completely and sign in again

---

### Issue: When I create new data, it's assigned to the wrong profile

**Possible causes:**
- Auth layer not using linked profile
- RLS policies overriding

**Solutions:**
1. Check that `getCurrentUserWithRole()` has the linked profile logic
2. Verify middleware has the linked profile logic
3. Check browser console for errors
4. Sign out and sign in again

---

### Issue: I want to UNDO the migration

**Rollback steps:**
1. Remove the profile link:
   ```sql
   UPDATE profiles
   SET linked_profile_id = NULL
   WHERE id = 'your-source-profile-id';
   ```
2. If you need to move data back:
   - This requires identifying which records were migrated
   - **Best practice:** Create a database backup BEFORE migration
   - Restore from backup if available
   - Otherwise, manual data migration back is needed

---

## Security Considerations

### Authentication Security

- ✅ Both auth accounts have **separate passwords**
  - Compromising one password doesn't compromise the other
  - Each email must authenticate separately
- ✅ Profile linking only affects **which data is shown**, not authentication
  - Users still need valid credentials to sign in
  - Supabase auth handles all password verification
- ✅ Row Level Security (RLS) policies still apply
  - Data isolation is maintained
  - Users can only access their own profile's data

### Data Integrity

- ✅ All foreign keys remain valid after migration
  - All `instructor_id` references point to valid profile
  - No orphaned records
- ✅ Unique constraints handled properly
  - Duplicate instructor-student relationships removed before migration
  - No constraint violations
- ✅ Timestamps preserved
  - `created_at` not modified during migration
  - Audit trail maintained

---

## Future: Unlinking Profiles

If you later want to separate the accounts:

1. **Create new separate data** (if needed)
   - New classes for one account
   - New students for one account
   - Decide which data stays with which profile

2. **Remove the link:**
   ```sql
   UPDATE profiles
   SET linked_profile_id = NULL
   WHERE id = 'source-profile-id';
   ```

3. **Test both logins:**
   - Each should show only its own data
   - No more data sharing

**Note:** After unlinking, you'll need to manually migrate some data back to the source profile if you want it split evenly.

---

## Files Reference

### New Files Created
- `migrations/15-add-profile-linking.sql` - Schema migration
- `migrations/16-migrate-instructor-data-TEMPLATE.sql` - Data migration template
- `migrations/get-profile-ids.sql` - Helper script to get IDs
- `PROFILE_LINKING_GUIDE.md` - This guide

### Modified Files
- `lib/auth/server-auth.ts` - Added linked profile logic to `getCurrentUserWithRole()`
- `lib/supabase/middleware.ts` - Added linked profile logic to `updateSession()`

---

## Support

If you encounter issues:

1. **Check the troubleshooting section** above
2. **Review verification queries** in the migration scripts
3. **Check browser console** for JavaScript errors
4. **Check Supabase logs** for database errors
5. **Ensure code is deployed** and cache is cleared

---

## Summary

After completing this migration:
- ✅ You can sign in with **either email address**
- ✅ All data is consolidated under the **primary/newer account**
- ✅ Creating new data with either login → owned by primary profile
- ✅ Both passwords remain separate (security maintained)
- ✅ Data integrity preserved (no orphaned records)
- ✅ Can be undone if needed (rollback available)

The migration is **safe**, **reversible**, and maintains **data integrity** and **authentication security**.
