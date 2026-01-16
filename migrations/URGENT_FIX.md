# URGENT: Fix Infinite Recursion Error

## Error
```
infinite recursion detected in policy for relation "classes"
```

## Cause
Migration 27 added RLS policies with JOINs that created a circular reference:
- Classes policy checks private_lesson_requests with JOIN to students
- This triggers cascading policy checks that loop infinitely

## Solution
Run this migration **immediately** to fix the error:

**File: `migrations/29-fix-classes-policy-recursion.sql`**

### What This Does
1. Drops the problematic policies
2. Recreates them using nested subqueries (no JOINs)
3. Adds performance indexes

### How to Apply
1. Go to Supabase SQL Editor: https://supabase.com
2. Copy the contents of `migrations/29-fix-classes-policy-recursion.sql`
3. Paste and run it
4. Verify: You should see "Success. No rows returned"

### After Applying
- ✅ Classes will load correctly
- ✅ Notes will display properly
- ✅ Dashboard will work for instructors and admins
- ✅ Private lesson requests will still link to classes correctly

## Updated Migration Order

If starting fresh, run migrations in this order:
1. Migration 26: Add columns to private_lesson_requests
2. Migration 27: Add RLS policies (has the bug)
3. Migration 28: Add admin access to students
4. **Migration 29: Fix the recursion bug** ⚠️ **CRITICAL**

## Technical Details

The fix changes from:
```sql
-- BAD: Creates circular reference
EXISTS (
  SELECT 1 FROM private_lesson_requests
  JOIN students ON students.id = private_lesson_requests.student_id
  WHERE private_lesson_requests.scheduled_class_id = classes.id
)
```

To:
```sql
-- GOOD: Uses nested subqueries
id IN (
  SELECT scheduled_class_id
  FROM private_lesson_requests
  WHERE student_id IN (
    SELECT id FROM students
    WHERE profile_id = auth.uid()
  )
)
```

This avoids triggering cascading RLS policy checks that create the infinite loop.
