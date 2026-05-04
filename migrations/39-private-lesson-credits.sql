-- Migration: Private Lesson Credits + Reschedule Requests
-- Adds class linkage and void tracking to lesson_pack_usage so credits can be
-- attributed to a specific class and refunded on cancel/delete. Also creates
-- the lesson_reschedule_requests table for dancer-initiated reschedule asks.

-- =====================================================
-- LESSON_PACK_USAGE: class linkage + void tracking
-- =====================================================

ALTER TABLE lesson_pack_usage
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_lesson_pack_usage_class_id
  ON lesson_pack_usage(class_id) WHERE class_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lesson_pack_usage_active
  ON lesson_pack_usage(class_id) WHERE voided_at IS NULL;

COMMENT ON COLUMN lesson_pack_usage.class_id IS 'The class this credit was spent on; NULL if the class was deleted.';
COMMENT ON COLUMN lesson_pack_usage.voided_at IS 'Set when the credit is refunded back to the pack (cancellation, deletion, instructor reinstate).';
COMMENT ON COLUMN lesson_pack_usage.voided_reason IS 'Free-text reason for the void (e.g. cancelled_outside_24h, class_deleted, instructor_reinstated).';

-- =====================================================
-- LESSON_RESCHEDULE_REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS lesson_reschedule_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  proposed_dates TEXT[] DEFAULT ARRAY[]::TEXT[],
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved' | 'declined'
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_reschedule_requests_class
  ON lesson_reschedule_requests(class_id);

CREATE INDEX IF NOT EXISTS idx_lesson_reschedule_requests_status
  ON lesson_reschedule_requests(status) WHERE status = 'pending';

ALTER TABLE lesson_reschedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_reschedule_requests_select_policy"
  ON lesson_reschedule_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lesson_reschedule_requests.student_id
        AND s.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('instructor', 'admin')
    )
  );

CREATE POLICY "lesson_reschedule_requests_insert_policy"
  ON lesson_reschedule_requests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = lesson_reschedule_requests.student_id
        AND s.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('instructor', 'admin')
    )
  );

CREATE POLICY "lesson_reschedule_requests_update_policy"
  ON lesson_reschedule_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('instructor', 'admin')
    )
  );
