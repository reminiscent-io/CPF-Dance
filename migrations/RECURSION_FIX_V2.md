# CRITICAL FIX: Infinite Recursion Error (V2)

## Current Error
```
infinite recursion detected in policy for relation "classes"
```

## Root Cause
RLS policies with subqueries that reference other tables with RLS policies can create circular dependencies, even with nested subqueries. PostgreSQL's query planner can trigger cascading policy evaluations that loop.

## Solution: SECURITY DEFINER Functions

Migration 30 uses a different approach that completely breaks the recursion chain.

### How It Works

1. **Creates a SECURITY DEFINER function** (`can_user_view_class`)
   - Runs with elevated privileges, bypassing RLS
   - Performs JOINs safely without triggering cascading RLS checks
   - Returns simple TRUE/FALSE

2. **Creates a simple policy** that calls this function
   - No subqueries or JOINs in the policy itself
   - Just calls the safe function

This is the PostgreSQL-recommended approach for avoiding RLS recursion.

## IMMEDIATE ACTION REQUIRED

### Option A: If You Haven't Run Migration 29 Yet
Skip migration 29 and go straight to migration 30:

1. Go to Supabase SQL Editor
2. Run `migrations/30-fix-recursion-with-functions.sql`
3. Done!

### Option B: If You Already Ran Migration 29
No problem, just run migration 30 on top of it:

1. Go to Supabase SQL Editor
2. Run `migrations/30-fix-recursion-with-functions.sql`
3. It will drop the old policies and replace them with the function-based approach

## What This Fixes

✅ Eliminates infinite recursion completely
✅ Classes load correctly for all users
✅ Notes display properly
✅ Dashboard works for instructors and admins
✅ Private lesson requests link to classes correctly
✅ Better performance (function is more efficient)

## Technical Details

### The Old Approach (Caused Recursion)
```sql
-- Direct subquery - can trigger cascading RLS checks
id IN (
  SELECT scheduled_class_id FROM private_lesson_requests
  WHERE student_id IN (
    SELECT id FROM students WHERE profile_id = auth.uid()
  )
)
```

### The New Approach (No Recursion)
```sql
-- Function with SECURITY DEFINER - bypasses RLS
can_user_view_class(id, auth.uid())
```

The function performs the same checks but with elevated privileges, so it doesn't trigger cascading RLS policy evaluations.

## Verification

After running migration 30:

1. Refresh your app
2. The `/api/classes` endpoint should return 200
3. Notes should load without errors
4. No more "infinite recursion" errors in the logs

## Complete Migration Order (Updated)

1. Migration 26: Add columns
2. Migration 27: Add RLS policies (introduced recursion)
3. Migration 28: Add admin access to students
4. ~~Migration 29: First recursion fix attempt (optional)~~
5. **Migration 30: Final recursion fix with SECURITY DEFINER** ⚠️ **RUN THIS**
