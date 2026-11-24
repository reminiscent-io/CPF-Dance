-- Migration 57: Dancers can't write lesson-pack credits
--
-- Two policies let a dancer (or her guardian) write lesson_pack_purchases
-- straight through the Supabase REST API: INSERT a purchase with any
-- remaining_lessons and no payment, or UPDATE remaining_lessons on one she
-- has. spendCreditForClass() then spends that balance as prepaid lessons when
-- the instructor schedules her.
--
-- lesson_pack_usage_insert_policy had a dancer branch too. A usage row she
-- inserted with some class_id gets refunded by refundCreditForClass() when
-- that class is cancelled or deleted, which adds a lesson back.
--
-- Nothing in the app needs either: the Stripe webhook creates purchases, and
-- lib/lesson-credits.ts spends and refunds through createAdminClient(). Both
-- bypass RLS. Dancers keep SELECT on their own purchases and usage.

DROP POLICY IF EXISTS "Students can create purchases" ON public.lesson_pack_purchases;
DROP POLICY IF EXISTS "Students can update their purchases" ON public.lesson_pack_purchases;

DROP POLICY IF EXISTS lesson_pack_usage_insert_policy ON public.lesson_pack_usage;
CREATE POLICY lesson_pack_usage_insert_policy ON public.lesson_pack_usage FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['instructor'::user_role, 'admin'::user_role]))))));
