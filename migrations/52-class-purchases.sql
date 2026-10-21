-- Migration 52: Ledger of Stripe sales on class sign-up links
--
-- A dancer who signs up from the portal carries a client_reference_id, and the
-- webhook enrolls them. Anyone who buys from the raw link (Instagram, a text,
-- before making an account) arrives with no ref, and those sales used to be
-- dropped. Now every paid sale on a class's link lands here:
--
--   student_id set    the buyer is enrolled (ref, or their email matched a dancer)
--   student_id NULL   paid, not yet linked: the instructor links them by hand
--
-- class_id is the class whose link was paid. A full-workshop sale sits on the
-- workshop's first upcoming day; workshop_option says what was bought.
-- The webhook writes with the service role; instructors and admins read and
-- link. Dancers have no access.

CREATE TABLE IF NOT EXISTS public.class_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  workshop_option TEXT CHECK (workshop_option IN ('full', 'day')),
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  buyer_name TEXT,
  buyer_email TEXT,
  buyer_phone TEXT,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  purchased_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS class_purchases_class_id_idx ON public.class_purchases (class_id);
CREATE INDEX IF NOT EXISTS class_purchases_unlinked_idx
  ON public.class_purchases (class_id)
  WHERE student_id IS NULL;

ALTER TABLE public.class_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "class_purchases_select_policy" ON public.class_purchases;
CREATE POLICY "class_purchases_select_policy" ON public.class_purchases
  FOR SELECT USING (public.promo_is_instructor());

DROP POLICY IF EXISTS "class_purchases_update_policy" ON public.class_purchases;
CREATE POLICY "class_purchases_update_policy" ON public.class_purchases
  FOR UPDATE USING (public.promo_is_instructor()) WITH CHECK (public.promo_is_instructor());

COMMENT ON TABLE public.class_purchases IS 'Paid Stripe checkouts on class sign-up links; student_id NULL = paid, not yet linked to a dancer';
