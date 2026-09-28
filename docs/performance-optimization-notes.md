# Database Performance Optimization Notes

## Completed Optimizations (Migration 19 & 20)

### 1. Auth RLS InitPlan Performance (Migration 19)
**Problem**: RLS policies were calling `auth.uid()` directly, causing the function to be re-evaluated for each row in query results, leading to poor performance at scale.

**Solution**: Wrapped all `auth.uid()` calls in subqueries: `(select auth.uid())`. This ensures the function is evaluated once per query instead of once per row.

**Tables Fixed**:
- `studios`: 3 policies
- `students`: 5 policies
- `waivers`: 3 policies
- `waiver_templates`: 1 policy

**Performance Impact**: Significant improvement for queries that return multiple rows, especially noticeable with 100+ rows.

### 2. Duplicate Indexes (Migration 20)
**Problem**: The `instructor_student_relationships` table had duplicate indexes consuming unnecessary storage and slowing down writes.

**Solution**: Removed duplicate indexes:
- `idx_relationships_instructor` (duplicate of `idx_instructor_student_relationships_instructor`)
- `idx_relationships_student` (duplicate of `idx_instructor_student_relationships_student`)
- `idx_relationships_status` (duplicate of `idx_instructor_student_relationships_status`)

**Performance Impact**: Reduced storage overhead and improved INSERT/UPDATE performance on the table.

---

## Future Optimization Opportunities

### Multiple Permissive Policies
**Problem**: Many tables have multiple permissive RLS policies for the same role and action. When multiple permissive policies exist, PostgreSQL must evaluate ALL of them for every query, even if one already grants access. This causes performance degradation.

**Current State**: The following tables are affected:

#### High Priority (5+ policies per action):
- **notes**: Up to 9 policies for SELECT operations
  - Policies: Admin access, instructor access (multiple variations), student access (multiple variations), studio access
- **enrollments**: Up to 5 policies for SELECT operations
  - Policies: Admin access, instructor access (multiple variations), student self-access

#### Medium Priority (3-4 policies per action):
- **classes**: 4 policies for SELECT, 2-3 for other operations
- **private_lesson_requests**: 4-7 policies per action
- **payment_events**: 3-6 policies per action
- **studio_inquiries**: 4-8 policies per action
- **students**: 2-7 policies per action
- **studios**: 2-6 policies per action

#### Lower Priority (2-3 policies per action):
- **instructor_student_relationships**: 2-3 policies per action
- **lesson_pack_purchases**: 2 policies for SELECT
- **lesson_pack_usage**: 2 policies per action
- **lesson_packs**: 2 policies for SELECT
- **waiver_templates**: 2 policies per action

### Recommended Consolidation Strategy

Instead of having separate policies like:
```sql
-- Current: Multiple policies
CREATE POLICY "Admins can view all notes" ON notes FOR SELECT USING (...);
CREATE POLICY "Instructors can view all notes" ON notes FOR SELECT USING (...);
CREATE POLICY "Students can view their notes" ON notes FOR SELECT USING (...);
```

Consolidate into a single policy with OR conditions:
```sql
-- Optimized: Single policy with OR conditions
CREATE POLICY "View notes" ON notes FOR SELECT USING (
  -- Admin can view all
  EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin')
  OR
  -- Instructor can view their students' notes
  (author_id = (select auth.uid()) AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'instructor'
  ))
  OR
  -- Student can view notes shared with them
  (student_id IN (
    SELECT id FROM students WHERE profile_id = (select auth.uid())
  ) AND visibility IN ('shared_with_student', 'shared_with_guardian'))
);
```

### Implementation Considerations

**Benefits**:
- Significantly improved query performance (single policy evaluation instead of multiple)
- Cleaner, more maintainable policy definitions
- Easier to audit and understand access control logic

**Risks**:
- Must ensure consolidated policies maintain identical security boundaries
- Requires thorough testing with all user roles
- Should be done incrementally, one table at a time

**Testing Checklist** (for each table):
1. Create test users for each role (admin, instructor, dancer, guardian)
2. Document current behavior for each role and action
3. Create consolidated policies in a test migration
4. Verify each role still has identical access patterns
5. Performance test with realistic data volumes
6. Deploy to production with monitoring

### Migration Planning

**Phase 1: High Priority Tables**
- Start with `notes` table (most impacted)
- Then `enrollments` table
- Document performance improvements

**Phase 2: Medium Priority Tables**
- Tackle `classes`, `private_lesson_requests`, `payment_events`
- Monitor production performance impact

**Phase 3: Lower Priority Tables**
- Complete remaining tables as time permits
- Focus on those with highest query frequency

**Timeline**: This optimization should be planned for a future sprint when there is adequate time for thorough testing. The current auth RLS fixes (Migration 19) will provide immediate performance benefits while we plan this more extensive refactoring.

---

## Performance Monitoring

After applying migrations 19 and 20, monitor:

1. **Query Performance**: Check pg_stat_statements for slow queries
2. **Database Load**: Monitor CPU and I/O usage on Supabase dashboard
3. **User Experience**: Track API response times for key endpoints

Expected improvements:
- Queries returning 100+ rows: 20-40% faster
- Write operations on `instructor_student_relationships`: 5-10% faster
- Overall database CPU usage: Slight reduction

---

## Additional Optimization Notes

### Other Performance Best Practices Already Implemented:
- ✅ Indexes on foreign keys
- ✅ Indexes on frequently queried columns (status, created_at, etc.)
- ✅ Appropriate use of `updated_at` triggers
- ✅ Connection pooling via Supabase

### Future Considerations:
- Consider partitioning large tables (notes, enrollments) by date if they grow to millions of rows
- Implement database vacuum monitoring
- Add composite indexes for common query patterns
- Consider materialized views for complex dashboard queries
