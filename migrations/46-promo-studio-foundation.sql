-- Migration 46: Promo Studio foundation
--
-- Private photo library, AI call log, AI budgets, and the private storage
-- bucket behind Promo Studio. Design: docs/superpowers/specs/2026-10-09-promo-studio-design.md
--
-- Ownership keys on the PRIMARY profile. An instructor can sign in with two
-- emails (migration 15, docs/profile-linking.md), and Courtney does.
-- getCurrentUserWithRole() swaps in the primary profile, so RLS has to as
-- well, or her library would split by which email she signed in with.
-- promo_owner_id() resolves auth.uid() through linked_profile_id, and every
-- policy below compares against it. promo_is_admin() checks the primary
-- profile's role for the same reason.
--
-- Helpers follow migration 45: SECURITY DEFINER, pinned search_path, and the
-- subject always comes from auth.uid() inside the function. None of them take
-- a user id, so they can't be used as an oracle about other accounts.
--
-- Run the whole file in the SQL editor. It creates the 'promo-private' bucket
-- itself, so there is no dashboard step. Safe to re-run.

-- =====================================================
-- HELPERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.promo_owner_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(p.linked_profile_id, p.id)
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.promo_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = public.promo_owner_id()
      AND p.role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.promo_is_instructor()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = public.promo_owner_id()
      AND p.role IN ('instructor', 'admin')
  )
$$;

REVOKE ALL ON FUNCTION public.promo_owner_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promo_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promo_is_instructor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promo_owner_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promo_is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.promo_is_instructor() TO authenticated, service_role;

COMMENT ON FUNCTION public.promo_owner_id() IS
  'Primary profile id for the caller (follows linked_profile_id). Promo Studio ownership key.';
COMMENT ON FUNCTION public.promo_is_admin() IS
  'True when the caller''s primary profile is an admin.';
COMMENT ON FUNCTION public.promo_is_instructor() IS
  'True when the caller''s primary profile is an instructor or admin.';

-- =====================================================
-- PROMO_ASSETS: the private photo library
-- =====================================================

-- The client generates the id so it can upload to {owner}/assets/{id}/...
-- before the row exists; the row is inserted once every file has landed.
CREATE TABLE IF NOT EXISTS public.promo_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.promo_assets(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ready'
    CHECK (status IN ('ready', 'pending_review', 'rejected')),
  original_path TEXT NOT NULL,
  display_path TEXT NOT NULL,
  thumb_path TEXT NOT NULL,
  matte_path TEXT,
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  bytes BIGINT NOT NULL DEFAULT 0 CHECK (bytes >= 0),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  original_filename TEXT,
  tags JSONB NOT NULL DEFAULT '{}'::jsonb,
  pose JSONB,
  tags_edited BOOLEAN NOT NULL DEFAULT false,
  tagged_at TIMESTAMPTZ,
  derivation JSONB,
  favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- A row can only point at files inside its owner's folder.
  CONSTRAINT promo_assets_paths_in_owner_folder CHECK (
    original_path LIKE owner_id::text || '/%'
    AND display_path LIKE owner_id::text || '/%'
    AND thumb_path LIKE owner_id::text || '/%'
    AND (matte_path IS NULL OR matte_path LIKE owner_id::text || '/%')
  )
);

-- One copy of each source photo per owner. Derived edits share their
-- original's bytes lineage, so they're exempt.
CREATE UNIQUE INDEX IF NOT EXISTS promo_assets_owner_sha256_key
  ON public.promo_assets(owner_id, sha256) WHERE parent_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_promo_assets_owner_created
  ON public.promo_assets(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_assets_parent
  ON public.promo_assets(parent_id) WHERE parent_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_promo_assets_updated_at ON public.promo_assets;
CREATE TRIGGER update_promo_assets_updated_at
  BEFORE UPDATE ON public.promo_assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.promo_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_assets_select" ON public.promo_assets;
CREATE POLICY "promo_assets_select" ON public.promo_assets
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

DROP POLICY IF EXISTS "promo_assets_insert" ON public.promo_assets;
CREATE POLICY "promo_assets_insert" ON public.promo_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT public.promo_owner_id())
    AND (SELECT public.promo_is_instructor())
  );

DROP POLICY IF EXISTS "promo_assets_update" ON public.promo_assets;
CREATE POLICY "promo_assets_update" ON public.promo_assets
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()))
  WITH CHECK (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

DROP POLICY IF EXISTS "promo_assets_delete" ON public.promo_assets;
CREATE POLICY "promo_assets_delete" ON public.promo_assets
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

REVOKE ALL ON public.promo_assets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_assets TO authenticated;

COMMENT ON TABLE public.promo_assets IS
  'Promo Studio photo library. Files live in the private promo-private bucket under {owner_id}/assets/{id}/.';

-- =====================================================
-- PROMO_AI_CALLS: every OpenAI call, with its cost
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promo_ai_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('tag', 'generate', 'revise', 'shorten', 'photo_edit')),
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok', 'invalid', 'error', 'capped')),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  -- Integer micro-dollars: a $0.002 call rounds to zero cents.
  cost_micros BIGINT NOT NULL DEFAULT 0 CHECK (cost_micros >= 0),
  latency_ms INTEGER,
  design_id UUID,
  asset_id UUID REFERENCES public.promo_assets(id) ON DELETE SET NULL,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_ai_calls_owner_created
  ON public.promo_ai_calls(owner_id, created_at DESC);

ALTER TABLE public.promo_ai_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_ai_calls_select" ON public.promo_ai_calls;
CREATE POLICY "promo_ai_calls_select" ON public.promo_ai_calls
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

-- No insert, update or delete policies: only the service role writes this
-- table, so nobody can erase their own spend.
REVOKE ALL ON public.promo_ai_calls FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.promo_ai_calls FROM authenticated;
GRANT SELECT ON public.promo_ai_calls TO authenticated;

-- =====================================================
-- PROMO_AI_BUDGETS: monthly cap per instructor
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promo_ai_budgets (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_cap_micros BIGINT NOT NULL CHECK (monthly_cap_micros >= 0),
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_promo_ai_budgets_updated_at ON public.promo_ai_budgets;
CREATE TRIGGER update_promo_ai_budgets_updated_at
  BEFORE UPDATE ON public.promo_ai_budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.promo_ai_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_ai_budgets_select" ON public.promo_ai_budgets;
CREATE POLICY "promo_ai_budgets_select" ON public.promo_ai_budgets
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

DROP POLICY IF EXISTS "promo_ai_budgets_admin_write" ON public.promo_ai_budgets;
CREATE POLICY "promo_ai_budgets_admin_write" ON public.promo_ai_budgets
  FOR ALL TO authenticated
  USING ((SELECT public.promo_is_admin()))
  WITH CHECK ((SELECT public.promo_is_admin()));

REVOKE ALL ON public.promo_ai_budgets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_ai_budgets TO authenticated;

-- Month buckets in the studio's timezone. security_invoker keeps the base
-- table's RLS in force for whoever queries the view.
CREATE OR REPLACE VIEW public.promo_ai_monthly
WITH (security_invoker = true) AS
SELECT
  owner_id,
  (date_trunc('month', created_at AT TIME ZONE 'America/New_York'))::date AS month,
  kind,
  COUNT(*)::integer AS calls,
  COALESCE(SUM(cost_micros), 0)::bigint AS cost_micros
FROM public.promo_ai_calls
GROUP BY 1, 2, 3;

REVOKE ALL ON public.promo_ai_monthly FROM anon;
GRANT SELECT ON public.promo_ai_monthly TO authenticated;

-- =====================================================
-- STORAGE: promo-private bucket
-- =====================================================
--
-- Layout:
--   {owner}/assets/{asset_id}/original.jpg | display.jpg | thumb.jpg
--   {owner}/designs/{design_id}/thumb.jpg
--   brand/{brand_kit_id}/logo.png   (readable by instructors, written by admins)
--
-- The bucket is private, so no public URL works. The app never issues signed
-- URLs either: the browser downloads with the user's JWT into blob: URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('promo-private', 'promo-private', false, 52428800, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "promo_private_select" ON storage.objects;
CREATE POLICY "promo_private_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'promo-private'
    AND (
      (storage.foldername(name))[1] = (SELECT public.promo_owner_id())::text
      OR (SELECT public.promo_is_admin())
      OR ((storage.foldername(name))[1] = 'brand' AND (SELECT public.promo_is_instructor()))
    )
  );

DROP POLICY IF EXISTS "promo_private_insert" ON storage.objects;
CREATE POLICY "promo_private_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'promo-private'
    AND (
      ((storage.foldername(name))[1] = (SELECT public.promo_owner_id())::text
        AND (SELECT public.promo_is_instructor()))
      OR (SELECT public.promo_is_admin())
    )
  );

-- Upserts (resumable uploads send x-upsert) need UPDATE as well as INSERT.
DROP POLICY IF EXISTS "promo_private_update" ON storage.objects;
CREATE POLICY "promo_private_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'promo-private'
    AND (
      (storage.foldername(name))[1] = (SELECT public.promo_owner_id())::text
      OR (SELECT public.promo_is_admin())
    )
  )
  WITH CHECK (
    bucket_id = 'promo-private'
    AND (
      ((storage.foldername(name))[1] = (SELECT public.promo_owner_id())::text
        AND (SELECT public.promo_is_instructor()))
      OR (SELECT public.promo_is_admin())
    )
  );

DROP POLICY IF EXISTS "promo_private_delete" ON storage.objects;
CREATE POLICY "promo_private_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'promo-private'
    AND (
      (storage.foldername(name))[1] = (SELECT public.promo_owner_id())::text
      OR (SELECT public.promo_is_admin())
    )
  );

-- =====================================================
-- VERIFY (run as a logged-out client, a dancer and a second instructor)
-- =====================================================
-- Every one of these should return no rows / no object for anyone but the
-- owner and admins:
--   select count(*) from promo_assets;
--   select count(*) from storage.objects where bucket_id = 'promo-private';
-- and GET {SUPABASE_URL}/storage/v1/object/public/promo-private/<any path>
-- should fail because the bucket is private.
