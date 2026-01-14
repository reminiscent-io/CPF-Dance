# RLS Security Migrations

This directory contains SQL migration files to implement comprehensive Row-Level Security (RLS) for the dance teaching platform.

## Overview

These migrations implement a relationship-based security model where:
- **Students** can only see their own data
- **Instructors** can only see data for students they teach (based on relationships)
- **Admins** can see everything except private student notes
- **Studio Admins** can only see their studio's data (requires studio linking)

## Migration Files

### 01-create-instructor-student-relationships.sql
**Purpose:** Creates the foundation for relationship-based security

**What it does:**
- Creates `instructor_student_relationships` table
- Tracks which instructors teach which students
- Manages student privacy permissions (notes, progress, payments)
- Adds RLS policies for the relationships table
- Creates trigger to auto-create relationships when students enroll

**Run this FIRST**

### 02-backfill-relationships.sql
**Purpose:** Populates existing relationships from historical data

**What it does:**
- Backfills relationships from existing enrollments
- Creates one relationship per unique instructor-student pair
- Sets default permissions (notes: yes, progress: yes, payments: no)

**Run this SECOND** (after 01)

### 03-update-rls-policies.sql
**Purpose:** Updates existing RLS policies to use relationships

**What it does:**
- Updates policies on: profiles, students, classes, enrollments, notes, payments, private_lesson_requests
- Restricts instructors to only see their students
- Implements complex note visibility (respects both visibility flags AND relationship permissions)
- Adds student self-service capabilities (self-enroll, update profile)

**Run this THIRD** (after 02)

### 04-add-missing-rls-policies.sql
**Purpose:** Adds RLS to tables that had none

**What it does:**
- Adds policies to `studios` table (currently wide open!)
- Adds policies to `payment_events` table (currently wide open!)
- Updates `studio_inquiries` to include admin access

**Run this FOURTH** (after 03)

## How to Run Migrations

### Step 1: Backup Your Database
Before running any migrations, backup your Supabase database:
1. Go to Supabase Dashboard → Database → Backups
2. Create a manual backup
3. Note the backup ID in case you need to restore

### Step 2: Run Migrations in Order

**In Supabase SQL Editor:**

1. Open `01-create-instructor-student-relationships.sql`
2. Copy entire file
3. Paste into SQL Editor
4. Click "Run"
5. Verify success (should show "Success" message)

Repeat for files 02, 03, 04 in order.

### Step 3: Verify After Each Migration

Each file has "VERIFICATION QUERIES" at the bottom. Run these to confirm the migration worked:

```sql
-- Example from 01:
SELECT COUNT(*) FROM instructor_student_relationships;

-- Example from 02:
SELECT COUNT(*) as total_relationships FROM instructor_student_relationships;

-- Example from 03:
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- Example from 04:
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;
```

### Step 4: Test Application

After running all migrations, test these scenarios:

**As Instructor:**
- Can you see only YOUR students?
- Can you create notes for YOUR students?
- Can you see classes you teach?
- Can you enroll students in your classes?

**As Student:**
- Can you see only YOUR notes?
- Can you see only YOUR classes?
- Can you update your profile?
- Can you control which instructors see your notes?

**As Admin:**
- Can you see all students?
- Can you see all classes?
- Can you see shared notes but NOT private student notes?

## Rollback Instructions

If something goes wrong, you can roll back:

### Quick Rollback (Disable RLS)
```sql
-- Temporarily disable RLS on all tables (DANGEROUS - only for emergency)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE private_lesson_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE studios DISABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_student_relationships DISABLE ROW LEVEL SECURITY;
```

### Full Rollback (Remove Changes)
```sql
-- Drop the relationships table (cascades to policies and triggers)
DROP TABLE IF EXISTS instructor_student_relationships CASCADE;

-- Restore from Supabase backup
-- (Use Supabase Dashboard → Database → Backups → Restore)
```

## Architecture Changes

### New Table: instructor_student_relationships

```sql
instructor_student_relationships
├── id (UUID, primary key)
├── instructor_id → profiles(id)
├── student_id → students(id)
├── can_view_notes (boolean) -- Student controls this
├── can_view_progress (boolean) -- Student controls this
├── can_view_payments (boolean) -- Student controls this
├── relationship_status (active/inactive/pending)
├── started_at (timestamp)
└── ended_at (timestamp)
```

### Key Concepts

**Relationship Status:**
- `active` - Currently teaching relationship
- `inactive` - Past relationship (student can still control permissions)
- `pending` - Future feature for approval flow

**Permission Flags:**
- Students can toggle these to control what instructors see
- `can_view_notes` - Allow instructor to see shared notes
- `can_view_progress` - Allow instructor to see progress metrics
- `can_view_payments` - Allow instructor to see payment history (default: false for privacy)

**Automatic Creation:**
- When student enrolled in class → relationship auto-created
- Trigger: `create_instructor_relationship_on_enrollment()`
- Ensures instructor-student link exists for RLS to work

## Security Model

### Before (Insecure):
```
Instructor queries students → Sees ALL students in database ❌
Instructor queries notes → Sees ALL notes ❌
Student queries classes → Sees ALL active classes ❌
```

### After (Secure):
```
Instructor queries students → Sees only THEIR students ✅
Instructor queries notes → Sees only THEIR students' notes (with permission) ✅
Student queries classes → Sees only ENROLLED classes ✅
Admin queries notes → Sees all EXCEPT private student notes ✅
```

## Performance Considerations

The new policies add JOINs to most queries. Indexes have been added to mitigate:

```sql
-- Relationships table indexes
idx_relationships_instructor (instructor_id)
idx_relationships_student (student_id)
idx_relationships_active_instructor (instructor_id, status) WHERE status='active'
idx_relationships_active_student (student_id, status) WHERE status='active'
```

**Monitor query performance** after migration. If slow:
1. Check query plans: `EXPLAIN ANALYZE SELECT ...`
2. Ensure indexes are being used
3. Consider materialized views for complex queries

## Future Enhancements

### Studio Linking (Recommended)
Create proper studio ownership to isolate studio admin data:

```sql
-- Option A: Add studio_id to profiles
ALTER TABLE profiles ADD COLUMN studio_id UUID REFERENCES studios(id);

-- Option B: Create junction table (more flexible)
CREATE TABLE studio_staff (
  studio_id UUID REFERENCES studios(id),
  profile_id UUID REFERENCES profiles(id),
  role TEXT -- 'owner', 'admin', 'staff'
);
```

Then update studio admin policies to filter by their studio.

### Permission Audit Log
Track when students change instructor permissions:

```sql
CREATE TABLE permission_changes (
  id UUID PRIMARY KEY,
  relationship_id UUID REFERENCES instructor_student_relationships(id),
  changed_by UUID REFERENCES profiles(id),
  field_name TEXT, -- 'can_view_notes', etc.
  old_value BOOLEAN,
  new_value BOOLEAN,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Relationship Approval Flow
Allow students to approve/reject instructor relationships:

```sql
-- Update trigger to create relationships as 'pending'
-- Add UI for students to approve
-- Instructor can only view after approval
```

## Troubleshooting

### "Permission denied" errors after migration
**Cause:** RLS policies are now enforced
**Solution:** Ensure user is authenticated and has correct role

### Instructor can't see any students
**Cause:** No relationships exist
**Solution:** Check `instructor_student_relationships` table. Run backfill script if empty.

### Student can't see instructor notes
**Cause:** Either visibility is 'private' OR relationship permission is disabled
**Solution:** Check:
1. Note visibility: `SELECT visibility FROM notes WHERE id = '...'`
2. Permission: `SELECT can_view_notes FROM instructor_student_relationships WHERE ...`

### Queries are slow
**Cause:** Relationship JOINs add overhead
**Solution:**
1. Verify indexes exist: `SELECT * FROM pg_indexes WHERE tablename = 'instructor_student_relationships'`
2. Analyze query: `EXPLAIN ANALYZE SELECT ...`
3. Consider adding more specific indexes

### Admin can't see private notes
**Expected Behavior:** Admins should NOT see notes with `visibility='private'` unless they authored them
**Reason:** Student privacy protection

## Support

If you encounter issues:
1. Check verification queries in each migration file
2. Review Supabase logs: Dashboard → Database → Logs
3. Test with different user roles
4. Check `auth.uid()` is returning correct user ID

## Summary of Changes

| Table | Before | After |
|-------|--------|-------|
| profiles | Instructors see all | Instructors see related students only |
| students | Instructors see all | Instructors see their students only |
| classes | Students see all active | Students see enrolled only |
| enrollments | Instructors see all | Instructors see their classes only |
| notes | Instructors see all | Complex: visibility + permissions |
| payments | Instructors see all | Instructors see if permission granted |
| studios | **NO POLICIES** ❌ | Role-based access ✅ |
| payment_events | **NO POLICIES** ❌ | Role-based access ✅ |

All migrations are **additive and safe** - they don't delete data, only add security constraints.

## Core Table Migrations

### 13a-create-instructor-student-relationships.sql
**Purpose:** Creates the instructor-student relationships table (foundational)

**What it does:**
- Creates `instructor_student_relationships` table to track which instructors can access which students
- Adds permission flags: `can_view_notes`, `can_view_progress`, `can_view_payments`
- Implements RLS policies restricting access to instructors and admins
- Used by migrations 14+ for relationship-based security

**Note:** This table is referenced by migrations 14, 19, 21 and the `/api/relationships` endpoint. This migration documents the table structure that was previously created manually.

## Performance Optimization Migrations

### 21-fix-auth-rls-performance.sql
**Purpose:** Optimize RLS policies for better query performance

**What it does:**
- Wraps all `auth.uid()` calls in subqueries: `(select auth.uid())`
- Prevents auth functions from being re-evaluated for each row
- Fixes performance warnings from Supabase database linter
- Affects tables: studios, students, waivers, waiver_templates

**Performance Impact:**
- 20-40% faster for queries returning 100+ rows
- Significant improvement for tables with large datasets
- No functional changes - security model remains identical

**Run this after migrations 01-20**

### 20-remove-duplicate-indexes.sql
**Purpose:** Remove duplicate indexes to improve write performance and reduce storage

**What it does:**
- Removes duplicate indexes on `instructor_student_relationships` table
- Keeps more descriptive index names
- Removes: `idx_relationships_*` in favor of `idx_instructor_student_relationships_*`

**Performance Impact:**
- Reduced storage overhead
- Faster INSERT/UPDATE operations on the relationships table
- No impact on query performance (identical indexes remain)

**Run this after migration 19**

For detailed information about these optimizations and future performance improvement opportunities, see `PERFORMANCE_OPTIMIZATION_NOTES.md` in the project root.
