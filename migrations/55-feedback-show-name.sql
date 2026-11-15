-- Migration 55: Name consent on class feedback
--
-- The feedback form now asks whether the instructor may use the dancer's name
-- with her feedback, e.g. as a testimonial on the website. It's an opt-out:
-- the box starts ticked, and unticking it keeps the response anonymous.
--
--   class_feedback.show_name   true  = OK to quote with her name
--                              false = quote anonymously, if at all
--
-- Responses sent before this migration never saw the question, so they stay
-- anonymous (false). Same name as reviews.show_name, which means the same.

ALTER TABLE public.class_feedback
  ADD COLUMN IF NOT EXISTS show_name BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.class_feedback.show_name IS 'Dancer agreed her name may be used with this feedback (e.g. website testimonials); false = anonymous';
