-- Migration 35: Backfill shared_with_studio notes to shared_with_student
-- Context: The studio portal was removed in migration 16, but the
-- AddNoteModal dropdown kept "Shared with Studio" as a visibility option
-- until now. Notes saved with that visibility were silently invisible to
-- dancers because the notes_select_policy (migration 22) only admits
-- shared_with_student and shared_with_guardian.
--
-- This migration converts existing shared_with_studio notes to
-- shared_with_student so the intended recipient can finally see them.
-- The enum value itself is left in place (dropping an enum value is
-- destructive in Postgres).

UPDATE public.notes
SET visibility = 'shared_with_student',
    updated_at = NOW()
WHERE visibility = 'shared_with_studio';
