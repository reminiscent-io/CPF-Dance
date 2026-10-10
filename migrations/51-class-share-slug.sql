-- Migration 51: Readable slugs for shared class links
--
-- The instructor's "Signup link" for a public class becomes
-- /classes/precision-workshop-oct-18-2026 instead of /classes/<uuid>.
--
--   classes.share_slug   minted once by POST /api/classes/[id]/share-link
--                        (lib/class-share-slug.ts) and never changed, so a
--                        link already sent keeps working after edits. A
--                        workshop's slug sits on its first day only.
--
-- The unique index settles collisions: two classes with the same title on the
-- same day get -2, -3, ... in the order their links were first requested.
-- Links that use the class id keep working and redirect to the slug.
--
-- No new policy: this is a plain column on classes, so the existing RLS
-- policies already cover it. The public page reads it with the service role.

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS share_slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS classes_share_slug_key
  ON public.classes (share_slug)
  WHERE share_slug IS NOT NULL;

COMMENT ON COLUMN public.classes.share_slug IS 'Readable slug for the public /classes/<slug> link; set once, never changed';
