# Private Lesson Request Fix

## Problem
Private lesson requests were not loading properly because:
1. Missing database columns: `instructor_id` and `scheduled_class_id` in the `private_lesson_requests` table
2. Missing RLS policies: Dancers couldn't view classes linked to their lesson requests
3. API not saving the instructor_id when creating requests

## Solution
Two migrations need to be applied **in order**:

### Migration 26: Add Missing Columns
File: `26-add-scheduled-class-to-lesson-requests.sql`

This adds:
- `instructor_id` column - Tracks which instructor the request is for
- `scheduled_class_id` column - Links the request to the class created from it
- Indexes for performance
- Documentation comments

### Migration 27: Fix RLS Policies
File: `27-fix-private-lesson-class-visibility.sql`

This adds:
- Policy allowing students to view classes linked to their lesson requests
- Policy allowing students to view classes they are enrolled in
- Updates instructor policy for better access control

## How to Apply

⚠️ **IMPORTANT**: Run these migrations **in order**!

### Step 1: Run Migration 26
1. Go to your Supabase project: https://supabase.com
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/26-add-scheduled-class-to-lesson-requests.sql`
4. Paste and run it
5. Verify: You should see "Success. No rows returned"

### Step 2: Run Migration 27
1. Still in **SQL Editor**
2. Copy the contents of `migrations/27-fix-private-lesson-class-visibility.sql`
3. Paste and run it
4. Verify: You should see "Success. No rows returned"

### Step 3: Run Migration 28 (Admin Access Fix)
1. Copy the contents of `migrations/28-add-admin-access-to-students.sql`
2. Paste and run it
3. Verify: You should see "Success. No rows returned"

### Step 4: Run Migration 29 (CRITICAL - Fixes Recursion Bug)
1. Copy the contents of `migrations/29-fix-classes-policy-recursion.sql`
2. Paste and run it
3. Verify: You should see "Success. No rows returned"
4. **This fixes the "infinite recursion" error!**

## What This Fixes

### For Dancers:
- ✅ Can now see scheduled lesson details when instructor creates a class from their request
- ✅ "Scheduled Lesson" section will show with date, time, and class title
- ✅ Can view classes they're enrolled in

### For Instructors:
- ✅ Can see all private lesson requests
- ✅ Can create a class from a request and link them together
- ✅ Request will update to show the scheduled class

### For Admins:
- ✅ Full access to view and manage all private lesson requests
- ✅ Can create classes from requests (same as instructors)
- ✅ Can view all classes across all instructors
- ✅ Admin role automatically bypasses instructor-only restrictions

## Code Changes Made

### API Update
`app/api/dancer/lesson-requests/route.ts`
- Now saves `instructor_id` when creating a lesson request

### No Front-End Changes Needed
The front-end code was already correct - it was just waiting for the database schema to match!

## Testing

After applying migrations, test:
1. **Dancer creates request**: Go to `/dancer/request-lesson` and submit a request
2. **Instructor views request**: Go to `/instructor/requests` and see the pending request
3. **Instructor creates class**: Click "Create Class" button on the request
4. **Dancer views result**: Go back to `/dancer/request-lesson` and see the "Scheduled Lesson" section appear

## Rollback (if needed)

If you need to rollback these changes:

```sql
-- Remove the policies
DROP POLICY IF EXISTS "Students can view classes linked to their lesson requests" ON classes;
DROP POLICY IF EXISTS "Students can view classes they are enrolled in" ON classes;

-- Remove the columns
ALTER TABLE private_lesson_requests DROP COLUMN IF EXISTS instructor_id;
ALTER TABLE private_lesson_requests DROP COLUMN IF EXISTS scheduled_class_id;

-- Drop the indexes
DROP INDEX IF EXISTS idx_private_lesson_requests_instructor_id;
DROP INDEX IF EXISTS idx_private_lesson_requests_scheduled_class_id;
```
