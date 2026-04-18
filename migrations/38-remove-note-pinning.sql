-- Migration: Remove note pinning functionality
-- The pin/unpin UI was removed from the dancer portal and the pin API route
-- has been deleted, so the pinning columns and related index are no longer
-- needed. (Originally added in migration 19.)
--
-- idx_notes_created_at is intentionally preserved — dancer notes are still
-- ordered by created_at DESC, so that index remains useful.

DROP INDEX IF EXISTS idx_notes_pinned;

ALTER TABLE notes
DROP COLUMN IF EXISTS is_pinned,
DROP COLUMN IF EXISTS pin_order;
