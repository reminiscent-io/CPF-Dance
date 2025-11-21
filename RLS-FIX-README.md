# Fix for Infinite Recursion in RLS Policies

## Problem

Your database Row Level Security (RLS) policies were causing infinite recursion errors with this message:

```
infinite recursion detected in policy for relation "classes"
infinite recursion detected in policy for relation "enrollments"
```

## Root Cause

The policies were using a `user_role()` function or directly querying the `profiles` table to check user roles. This created circular dependencies:

1. App queries `classes` table
2. RLS policy calls `user_role()` function
3. `user_role()` function queries `profiles` table
4. `profiles` table RLS might reference other tables
5. Loop continues → infinite recursion

## Solution

Replace all `user_role()` function calls and `profiles` table queries with direct JWT metadata checks. Since your signup flow already stores the user's role in JWT metadata, we can read it directly without any database queries.

**Before:** `user_role() = 'admin'`

**After:** `(auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'`

## How to Apply the Fix

### Step 1: Backup (Recommended)

Before making changes, export your current policies as a backup:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor**
4. Run this query to export all policies:

```sql
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

5. Save the results

### Step 2: Run the Fix Script

1. Open the file `fix-infinite-recursion-rls.sql` in this project
2. Copy the entire contents
3. Go to **SQL Editor** in Supabase
4. Paste the script
5. Click **Run**

You should see success messages at the end.

### Step 3: Verify the Fix

Test your application immediately:

1. Try loading the classes page: `/instructor/classes`
2. Check the browser console for errors
3. Verify the API endpoint: `/api/classes?upcoming=true`

If you see class data loading without "infinite recursion" errors, the fix worked!

### Step 4: Verify Policy Changes

Confirm all policies were updated correctly:

```sql
-- Check for any remaining user_role() calls (should return 0 rows)
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual::text LIKE '%user_role()%'
    OR with_check::text LIKE '%user_role()%'
  );
```

If this returns any rows, those policies still need to be updated.

## What This Script Changes

The script updates policies on these tables:

- **classes** (4 policies)
- **enrollments** (3 policies)
- **notes** (5 policies)
- **private_lesson_requests** (6 policies)
- **students** (5 policies)
- **instructor_student_relationships** (3 policies)
- **payment_events** (4 policies)
- **studio_inquiries** (4 policies)
- **studios** (2 policies)
- **profiles** (2 policies - fixed incorrect JWT path)

**Total:** 38 policies updated

## What Stays the Same

- All authorization logic remains identical
- User permissions are unchanged
- Database structure is unaffected
- Only the method of checking roles is updated

## Rollback (If Needed)

If something goes wrong, you can temporarily disable RLS on affected tables:

```sql
-- EMERGENCY ONLY - Removes all database-level security
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
-- etc.
```

Note: This removes database-level security. Your API routes will still enforce permissions, but it's not recommended for production.

## Technical Details

### Why JWT Metadata?

Your application already stores the user role in JWT metadata during signup:

```javascript
// From app/api/auth/signup/route.ts
const { data: authData, error: signUpError } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      role: role,  // ← Stored in user_metadata
      // ...
    }
  }
})
```

Reading from JWT metadata:
- ✅ No database queries
- ✅ No recursion possible
- ✅ Fast and efficient
- ✅ Same security level

### JWT Metadata Path

The correct path to access role in Supabase RLS policies is:

```sql
auth.jwt() -> 'user_metadata' ->> 'role'
```

Not:
- ❌ `auth.jwt() ->> 'role'` (wrong level)
- ❌ `user_role()` (causes recursion)
- ❌ `SELECT role FROM profiles WHERE id = auth.uid()` (causes recursion)

## Support

If you encounter any issues after applying this fix:

1. Check the Supabase logs for detailed error messages
2. Verify all policies were created successfully (no SQL errors)
3. Confirm your users have the `role` field in their JWT metadata
4. Try signing out and signing in again to refresh the JWT token

## Files in This Fix

- `fix-infinite-recursion-rls.sql` - The migration script
- `RLS-FIX-README.md` - This documentation
- `attached_assets/Pasted--schemaname-tablename-policyname--*.txt` - Original policy dump (reference)
