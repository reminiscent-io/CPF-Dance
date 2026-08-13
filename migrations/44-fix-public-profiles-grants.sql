-- Migration 44: Lock down grants on the public_profiles view
--
-- Context: Migration 38 created `public.public_profiles` with
-- `security_invoker = false` so it runs as its owner (postgres, which has
-- BYPASSRLS) and deliberately ignores the restrictive RLS on `profiles`.
-- That part is intentional and still is — see the rationale in
-- 38-restrict-profile-access.sql.
--
-- What migration 38 got wrong was the *grants*. It ran:
--
--   GRANT SELECT ON public.public_profiles TO authenticated;
--
-- believing that was the only access path. It wasn't. Supabase ships a
-- default-privileges rule that grants ALL on new tables/views in `public`
-- to `anon` and `authenticated`, so the view was born with SELECT, INSERT,
-- UPDATE and DELETE already granted to both roles. The explicit GRANT was
-- redundant and masked the real exposure.
--
-- Two consequences, both verified against production before this migration:
--
--   1. READ: `anon` could SELECT every row. Every base table in `public`
--      has RLS enabled, so the blanket anon grants are harmless there —
--      but a view has no RLS of its own, and this one bypasses the RLS of
--      the table beneath it. It was the only relation in `public` with no
--      row-level protection at all, making the full user directory
--      (id, full_name, avatar_url, role) readable with the publishable
--      anon key that ships to every browser via NEXT_PUBLIC_SUPABASE_ANON_KEY.
--
--   2. WRITE: the view is a simple single-table projection, so Postgres
--      makes it auto-updatable (information_schema.views.is_updatable =
--      YES). Combined with the inherited UPDATE/DELETE grants and the
--      owner's BYPASSRLS, `anon` could write straight through the view
--      into `profiles` — renaming any user, deleting profile rows, or
--      setting their own `role` to 'admin'. This is the serious one.
--
-- Fix: strip the inherited privileges and re-grant only what the app uses.
-- Every consumer of this view (lib/auth/server-auth.ts and the
-- app/api/dancer/* routes) sits behind requireDancer() /
-- getCurrentDancerStudent() and queries as `authenticated`, so read-only
-- access for `authenticated` is the complete requirement. Nothing reads
-- this view anonymously.
--
-- Note: this does NOT silence the `security_definer_view` linter (0010),
-- and it shouldn't. That warning correctly describes what the view does.
-- The bypass remains deliberate; what changes is that the bypass is no
-- longer reachable by anonymous users or by any write verb.

REVOKE ALL ON public.public_profiles FROM anon;
REVOKE ALL ON public.public_profiles FROM authenticated;

GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS
  'Non-sensitive directory view of profiles (id, full_name, avatar_url, role). Runs as owner and bypasses RLS on profiles by design; therefore SELECT-only, and granted to authenticated only. Never grant write verbs or anon access here - the view is auto-updatable and the owner has BYPASSRLS, so any write grant is a direct RLS bypass into profiles.';

-- Reminder for future work: any new view created in `public` inherits the
-- same ALL-to-anon-and-authenticated default privileges. For views that
-- bypass RLS, always follow CREATE VIEW with an explicit REVOKE ALL.
