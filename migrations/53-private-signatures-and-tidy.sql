-- Migration 53: private waiver signatures, one over-broad storage policy, and tidy-up
--
-- Safe to run twice. Ship the app code that stores signature paths and serves
-- them through signed URLs with this (the bucket holds no files yet).

-- 1. Waiver signatures become private. The app reads them with the service
--    role and hands out short-lived signed URLs, so no SELECT policy replaces
--    the public one.
UPDATE storage.buckets SET public = false WHERE id = 'waiver-signatures';
DROP POLICY IF EXISTS "Anyone can view waiver signatures" ON storage.objects;

-- 2. This upload policy has no bucket_id check, so an instructor could write
--    into any bucket under a folder named for their user id. "Allow instructors
--    to upload assets" covers the assets bucket with the same condition.
DROP POLICY IF EXISTS "Instructors can upload assets 1bqp9qb_0" ON storage.objects;

-- 3. Nothing in the app subscribes to realtime. DROP TABLE has no IF EXISTS
--    form, so each table is dropped only while it is still published.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
  LOOP
    EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE %I.%I', t.schemaname, t.tablename);
  END LOOP;
END $$;

-- 4. idx_enrollments_class is the same btree (class_id).
DROP INDEX IF EXISTS public.idx_enrollments_class_id;
