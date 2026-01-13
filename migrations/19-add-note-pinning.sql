-- Migration: Add pinning functionality to notes
-- This allows dancers to pin important notes to the top of their feed

-- Add columns for pinning
ALTER TABLE notes
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pin_order INTEGER DEFAULT NULL;

-- Create indexes for performance
-- Index for querying pinned notes
CREATE INDEX IF NOT EXISTS idx_notes_pinned
  ON notes(student_id, is_pinned, pin_order)
  WHERE is_pinned = true;

-- Index for date-based sorting (optimizes ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_notes_created_at
  ON notes(student_id, created_at DESC);

-- Comment on columns
COMMENT ON COLUMN notes.is_pinned IS 'Whether this note is pinned to the top of the feed';
COMMENT ON COLUMN notes.pin_order IS 'Order of pinned notes (NULL for unpinned notes, lower numbers appear first)';
