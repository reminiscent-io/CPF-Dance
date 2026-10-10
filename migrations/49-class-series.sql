-- Migration 49: Link the days of a multi-day workshop (or any repeated class)
--
-- Every class created in one recurring batch shares a series_id. The app uses
-- it to show "Day 2 of 3", apply edits to the remaining days, delete the
-- remaining days together, and enroll a dancer in every day of a workshop.
--
-- No new policy: series_id is a plain column on classes, so the existing
-- classes RLS policies already cover reads and writes.

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS series_id UUID;

CREATE INDEX IF NOT EXISTS idx_classes_series_id
  ON public.classes(series_id)
  WHERE series_id IS NOT NULL;

COMMENT ON COLUMN public.classes.series_id IS
  'Shared by every day of a multi-day workshop or recurring class batch; NULL for standalone classes';
