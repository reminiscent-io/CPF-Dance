-- Migration 54: Feedback on classes, workshops and private lessons
--
-- Dancers rate a class (1-5 stars) and answer a few optional prompts. Two ways in:
--
--   /feedback/<token>          a link the instructor copies and texts out. No
--                              sign-in. Anyone with the link can send feedback,
--                              any number of times, under whatever name they type.
--   /dancer/feedback/<class>   from the dancer portal. One response per dancer per
--                              class; sending again edits it.
--
--   classes.feedback_token     minted once by POST /api/classes/[id]/feedback-link
--                              and never changed. Random, so a link can't be
--                              guessed from a class title. A workshop's token
--                              sits on its first day and covers the whole run,
--                              like share_slug (migration 51).
--
--   class_feedback.class_id    the class the feedback is about; for a workshop,
--                              its first day.
--   class_feedback.student_id  set for portal responses, NULL for link ones.
--
-- Writes go through the API with the service role (the link has no signed-in
-- user to check), so the table has no insert or update policy. Instructors and
-- admins read everything; a dancer reads her own.

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS feedback_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS classes_feedback_token_key
  ON public.classes (feedback_token)
  WHERE feedback_token IS NOT NULL;

COMMENT ON COLUMN public.classes.feedback_token IS 'Random key for the no-login /feedback/<token> link; set once, never changed';

CREATE TABLE IF NOT EXISTS public.class_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  name TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  do_again TEXT,
  more_of TEXT,
  less_of TEXT,
  outcomes TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- NULLs are distinct, so link responses (no student) never collide
  CONSTRAINT class_feedback_class_id_student_id_key UNIQUE (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS class_feedback_class_id_idx ON public.class_feedback (class_id);

DROP TRIGGER IF EXISTS set_updated_at ON public.class_feedback;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.class_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.class_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_feedback_instructor_select" ON public.class_feedback;
CREATE POLICY "class_feedback_instructor_select" ON public.class_feedback
  FOR SELECT USING (public.promo_is_instructor());

DROP POLICY IF EXISTS "class_feedback_dancer_select" ON public.class_feedback;
CREATE POLICY "class_feedback_dancer_select" ON public.class_feedback
  FOR SELECT USING (
    student_id IN (
      SELECT s.id FROM public.students s
      WHERE s.profile_id = (SELECT auth.uid()) OR s.guardian_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE public.class_feedback IS 'Dancer feedback on a class; workshops are keyed by their first day. student_id NULL = sent from the no-login link';
