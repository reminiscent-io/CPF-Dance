-- Migration 47: Promo Studio brand kits, templates and designs
--
-- Run after 46 (it uses promo_owner_id(), promo_is_admin() and
-- promo_is_instructor()). Safe to re-run.
--
-- Templates are versioned. Each template has at most one draft (a version row
-- with published_at NULL). Publishing stamps published_at, and from then on a
-- trigger refuses any UPDATE or DELETE of that row. Designs pin the exact
-- version they were made from, so editing a template never changes a saved
-- design. Designs also snapshot the brand kit for the same reason.
--
-- The built-in "Precision Workshop" template and the studio brand kit are not
-- seeded here: the app inserts them from lib/promo on first use, so their
-- definitions stay type-checked TypeScript.

-- =====================================================
-- PROMO_BRAND_KITS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promo_brand_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL owner = the studio default kit.
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Studio brand',
  tokens JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_brand_kits_one_studio_default
  ON public.promo_brand_kits ((owner_id IS NULL)) WHERE owner_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS promo_brand_kits_owner_key
  ON public.promo_brand_kits (owner_id) WHERE owner_id IS NOT NULL;

DROP TRIGGER IF EXISTS update_promo_brand_kits_updated_at ON public.promo_brand_kits;
CREATE TRIGGER update_promo_brand_kits_updated_at
  BEFORE UPDATE ON public.promo_brand_kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.promo_brand_kits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_brand_kits_select" ON public.promo_brand_kits;
CREATE POLICY "promo_brand_kits_select" ON public.promo_brand_kits
  FOR SELECT TO authenticated
  USING ((SELECT public.promo_is_instructor()));

DROP POLICY IF EXISTS "promo_brand_kits_admin_write" ON public.promo_brand_kits;
CREATE POLICY "promo_brand_kits_admin_write" ON public.promo_brand_kits
  FOR ALL TO authenticated
  USING ((SELECT public.promo_is_admin()))
  WITH CHECK ((SELECT public.promo_is_admin()));

REVOKE ALL ON public.promo_brand_kits FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_brand_kits TO authenticated;

-- =====================================================
-- PROMO_TEMPLATES and PROMO_TEMPLATE_VERSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  current_version_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promo_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT: templates are archived, never deleted, so pinned designs keep
  -- their version.
  template_id UUID NOT NULL REFERENCES public.promo_templates(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version > 0),
  definition JSONB NOT NULL,
  -- Shape of `definition`, so the renderer can keep reading old versions after
  -- the schema evolves.
  definition_format INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_template_versions_one_draft
  ON public.promo_template_versions (template_id) WHERE published_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promo_templates_current_version_fkey'
  ) THEN
    ALTER TABLE public.promo_templates
      ADD CONSTRAINT promo_templates_current_version_fkey
      FOREIGN KEY (current_version_id)
      REFERENCES public.promo_template_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Published versions are frozen. Publishing itself is an UPDATE of a draft
-- (OLD.published_at IS NULL), so it passes.
CREATE OR REPLACE FUNCTION public.promo_template_versions_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Template version % of template % is published and cannot change',
      OLD.version, OLD.template_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promo_template_versions_freeze ON public.promo_template_versions;
CREATE TRIGGER promo_template_versions_freeze
  BEFORE UPDATE OR DELETE ON public.promo_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.promo_template_versions_freeze();

DROP TRIGGER IF EXISTS update_promo_templates_updated_at ON public.promo_templates;
CREATE TRIGGER update_promo_templates_updated_at
  BEFORE UPDATE ON public.promo_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_promo_template_versions_updated_at ON public.promo_template_versions;
CREATE TRIGGER update_promo_template_versions_updated_at
  BEFORE UPDATE ON public.promo_template_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.promo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_template_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_templates_select" ON public.promo_templates;
CREATE POLICY "promo_templates_select" ON public.promo_templates
  FOR SELECT TO authenticated
  USING ((SELECT public.promo_is_instructor()));

DROP POLICY IF EXISTS "promo_templates_admin_write" ON public.promo_templates;
CREATE POLICY "promo_templates_admin_write" ON public.promo_templates
  FOR ALL TO authenticated
  USING ((SELECT public.promo_is_admin()))
  WITH CHECK ((SELECT public.promo_is_admin()));

-- Instructors see published versions; drafts are for admins.
DROP POLICY IF EXISTS "promo_template_versions_select" ON public.promo_template_versions;
CREATE POLICY "promo_template_versions_select" ON public.promo_template_versions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.promo_is_admin())
    OR (published_at IS NOT NULL AND (SELECT public.promo_is_instructor()))
  );

DROP POLICY IF EXISTS "promo_template_versions_admin_write" ON public.promo_template_versions;
CREATE POLICY "promo_template_versions_admin_write" ON public.promo_template_versions
  FOR ALL TO authenticated
  USING ((SELECT public.promo_is_admin()))
  WITH CHECK ((SELECT public.promo_is_admin()));

REVOKE ALL ON public.promo_templates FROM anon;
REVOKE ALL ON public.promo_template_versions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_template_versions TO authenticated;

-- =====================================================
-- PROMO_DESIGNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promo_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled promo' CHECK (char_length(title) <= 200),
  template_version_id UUID NOT NULL REFERENCES public.promo_template_versions(id) ON DELETE RESTRICT,
  format TEXT NOT NULL CHECK (format IN ('ig_post', 'ig_story', 'poster')),
  -- Post, story and poster versions of the same promo share a group.
  group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  class_ids UUID[] NOT NULL DEFAULT '{}',
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  document JSONB NOT NULL,
  brand_snapshot JSONB NOT NULL,
  -- Bumped on every save; autosave sends the revision it started from.
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  thumbnail_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_designs_owner_updated
  ON public.promo_designs(owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_designs_group
  ON public.promo_designs(group_id);

DROP TRIGGER IF EXISTS update_promo_designs_updated_at ON public.promo_designs;
CREATE TRIGGER update_promo_designs_updated_at
  BEFORE UPDATE ON public.promo_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.promo_designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_designs_select" ON public.promo_designs;
CREATE POLICY "promo_designs_select" ON public.promo_designs
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

DROP POLICY IF EXISTS "promo_designs_insert" ON public.promo_designs;
CREATE POLICY "promo_designs_insert" ON public.promo_designs
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT public.promo_owner_id())
    AND (SELECT public.promo_is_instructor())
  );

DROP POLICY IF EXISTS "promo_designs_update" ON public.promo_designs;
CREATE POLICY "promo_designs_update" ON public.promo_designs
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()))
  WITH CHECK (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

DROP POLICY IF EXISTS "promo_designs_delete" ON public.promo_designs;
CREATE POLICY "promo_designs_delete" ON public.promo_designs
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

REVOKE ALL ON public.promo_designs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_designs TO authenticated;

-- =====================================================
-- PROMO_DESIGN_REVISIONS: AI results and checkpoints
-- =====================================================

CREATE TABLE IF NOT EXISTS public.promo_design_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES public.promo_designs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  document JSONB NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('generate', 'ai_revise', 'checkpoint', 'restore')),
  instruction TEXT,
  summary TEXT,
  ai_call_id UUID REFERENCES public.promo_ai_calls(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_design_revisions_design
  ON public.promo_design_revisions(design_id, created_at DESC);

ALTER TABLE public.promo_design_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_design_revisions_select" ON public.promo_design_revisions;
CREATE POLICY "promo_design_revisions_select" ON public.promo_design_revisions
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

DROP POLICY IF EXISTS "promo_design_revisions_insert" ON public.promo_design_revisions;
CREATE POLICY "promo_design_revisions_insert" ON public.promo_design_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT public.promo_owner_id())
    AND EXISTS (
      SELECT 1 FROM public.promo_designs d
      WHERE d.id = design_id AND d.owner_id = (SELECT public.promo_owner_id())
    )
  );

DROP POLICY IF EXISTS "promo_design_revisions_delete" ON public.promo_design_revisions;
CREATE POLICY "promo_design_revisions_delete" ON public.promo_design_revisions
  FOR DELETE TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

REVOKE ALL ON public.promo_design_revisions FROM anon;
GRANT SELECT, INSERT, DELETE ON public.promo_design_revisions TO authenticated;

-- =====================================================
-- PROMO_PUBLICATIONS: public copies on the site
-- =====================================================
--
-- Publishing copies a web-size render into the existing public `assets`
-- bucket and `assets` table, so classes.asset_id, the class form's asset
-- picker and /instructor/assets work unchanged. Unpublishing deletes that copy
-- and restores whatever image the class had before.

CREATE TABLE IF NOT EXISTS public.promo_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES public.promo_designs(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  public_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  previous_class_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  revision INTEGER NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unpublished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS promo_publications_one_live
  ON public.promo_publications(design_id) WHERE unpublished_at IS NULL;

ALTER TABLE public.promo_publications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_publications_select" ON public.promo_publications;
CREATE POLICY "promo_publications_select" ON public.promo_publications
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

DROP POLICY IF EXISTS "promo_publications_insert" ON public.promo_publications;
CREATE POLICY "promo_publications_insert" ON public.promo_publications
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = (SELECT public.promo_owner_id())
    AND EXISTS (
      SELECT 1 FROM public.promo_designs d
      WHERE d.id = design_id AND d.owner_id = (SELECT public.promo_owner_id())
    )
  );

DROP POLICY IF EXISTS "promo_publications_update" ON public.promo_publications;
CREATE POLICY "promo_publications_update" ON public.promo_publications
  FOR UPDATE TO authenticated
  USING (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()))
  WITH CHECK (owner_id = (SELECT public.promo_owner_id()) OR (SELECT public.promo_is_admin()));

REVOKE ALL ON public.promo_publications FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.promo_publications TO authenticated;

-- =====================================================
-- Link the AI log to designs now that the table exists
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'promo_ai_calls_design_id_fkey'
  ) THEN
    ALTER TABLE public.promo_ai_calls
      ADD CONSTRAINT promo_ai_calls_design_id_fkey
      FOREIGN KEY (design_id) REFERENCES public.promo_designs(id) ON DELETE SET NULL;
  END IF;
END $$;
