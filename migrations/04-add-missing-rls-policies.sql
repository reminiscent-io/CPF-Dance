-- Migration: Add Missing RLS Policies
-- This adds RLS policies to tables that currently have none (studios, payment_events)
-- Run this AFTER the relationship table and policy updates

-- ============================================================================
-- STUDIOS TABLE - Currently has NO RLS policies!
-- ============================================================================

-- Studios table should already have RLS enabled, but let's ensure it
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

-- Instructors can view all studios (to assign classes to locations)
CREATE POLICY "Instructors can view all studios"
  ON studios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Instructors can create studios
CREATE POLICY "Instructors can create studios"
  ON studios FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Instructors can update studios they created or use
-- Note: This is permissive - in production you may want to track studio ownership
CREATE POLICY "Instructors can update studios"
  ON studios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'instructor'
    )
  );

-- Studio admins can view all studios (for browsing)
-- TODO: Restrict to their specific studio once studio linking is implemented
CREATE POLICY "Studio admins can view studios"
  ON studios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'studio_admin'
    )
  );

-- Studio admins can update their studio
-- TODO: Add proper studio ownership/linking mechanism
CREATE POLICY "Studio admins can update their studio"
  ON studios FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'studio_admin'
      -- Future: AND profiles.studio_id = studios.id
    )
  );

-- Admins can manage all studios
CREATE POLICY "Admins can manage all studios"
  ON studios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- PAYMENT_EVENTS TABLE - Currently has NO RLS policies!
-- ============================================================================

-- Payment events table should already have RLS enabled, but let's ensure it
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Students can view events for their payments
CREATE POLICY "Students can view their payment events"
  ON payment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN students s ON p.student_id = s.id
      WHERE p.id = payment_events.payment_id
      AND (s.profile_id = auth.uid() OR s.guardian_id = auth.uid())
    )
  );

-- Instructors can view events for their student payments (if permission granted)
CREATE POLICY "Instructors can view student payment events"
  ON payment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      JOIN instructor_student_relationships isr ON p.student_id = isr.student_id
      WHERE p.id = payment_events.payment_id
      AND isr.instructor_id = auth.uid()
      AND isr.relationship_status = 'active'
      AND isr.can_view_payments = true
    )
  );

-- System/Instructors can create events (typically done automatically)
CREATE POLICY "Instructors can create payment events"
  ON payment_events FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('instructor', 'studio_admin')
    )
  );

-- Studio admins can view events for their studio payments
CREATE POLICY "Studio admins can view studio payment events"
  ON payment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'studio_admin'
      -- Future: Filter by studio when linking is implemented
    )
  );

-- Admins can view all events
CREATE POLICY "Admins can view all payment events"
  ON payment_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can create events
CREATE POLICY "Admins can create payment events"
  ON payment_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- STUDIO_INQUIRIES TABLE - Add admin policy
-- ============================================================================

-- Add admin access to studio inquiries
CREATE POLICY "Admins can manage all inquiries"
  ON studio_inquiries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Verify RLS is enabled on all tables
-- SELECT
--   schemaname,
--   tablename,
--   rowsecurity as rls_enabled
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- 2. Count policies on each table
-- SELECT
--   schemaname,
--   tablename,
--   COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename
-- ORDER BY tablename;

-- 3. Check tables without any policies (should be none critical)
-- SELECT t.tablename
-- FROM pg_tables t
-- LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
-- WHERE t.schemaname = 'public'
-- AND t.rowsecurity = true
-- GROUP BY t.tablename
-- HAVING COUNT(p.policyname) = 0;

-- 4. List all policies by table
-- SELECT
--   tablename,
--   policyname,
--   cmd as operation,
--   CASE
--     WHEN roles = '{}'::name[] THEN 'ALL ROLES'
--     ELSE roles::text
--   END as applies_to
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- NOTES
-- ============================================================================

-- Remaining Tasks:
-- 1. Implement studio ownership/linking mechanism
--    - Either add studio_id to profiles table
--    - Or create studio_staff junction table
-- 2. Update studio policies to use ownership once implemented
-- 3. Consider adding creator_id to studios table to track who created it
-- 4. Test payment event creation in your application

-- Security Considerations:
-- - Studios are currently viewable by all instructors (needed for class creation)
-- - Payment events are audit trails - carefully control INSERT permissions
-- - Studio admins need studio linking to properly isolate their data
