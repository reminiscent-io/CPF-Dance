-- Migration 36: Add 'shared_with_instructor' to note_visibility enum
-- Context: The codebase (dancer API defaults, type definitions,
-- DancerAddNoteModal UI, and filter queries) has always assumed that
-- 'shared_with_instructor' is a valid visibility value, but no migration
-- ever added it to the enum. A dancer saving a note without specifying
-- visibility falls through to the dancer API's default of
-- 'shared_with_instructor' and the INSERT fails with an invalid-enum error.
--
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
-- Postgres, so apply this migration on its own (not bundled).

ALTER TYPE public.note_visibility ADD VALUE IF NOT EXISTS 'shared_with_instructor';
