-- Migration 50: Full-workshop pricing for multi-day workshops
--
-- A linked workshop (migration 49) can sell the whole run at one price and,
-- optionally, single days at the day's own price.
--
--   classes.workshop_price        per-person price for every day together
--   classes.workshop_signup_url   payment link for the whole run (e.g. Stripe)
--   classes.workshop_full_only    true = no single-day drop-ins
--   enrollments.workshop_pass     true = this dancer bought the whole run
--
-- The class fields are copied onto every day of the series, like title and
-- pricing. Earnings split a pass's price evenly across the days.
--
-- No new policy: these are plain columns on classes and enrollments, so the
-- existing RLS policies already cover them.

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS workshop_price DECIMAL(10,2);
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS workshop_signup_url TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS workshop_full_only BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS workshop_pass BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.classes.workshop_price IS 'Per-person price for the whole multi-day workshop; NULL when only single days are sold';
COMMENT ON COLUMN public.classes.workshop_signup_url IS 'External payment/sign-up link for the whole workshop';
COMMENT ON COLUMN public.classes.workshop_full_only IS 'True when the workshop is sold as a full run only (no single-day drop-ins)';
COMMENT ON COLUMN public.enrollments.workshop_pass IS 'True when the dancer enrolled in the whole workshop rather than a single day';
