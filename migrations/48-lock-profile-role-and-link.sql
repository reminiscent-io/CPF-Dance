-- Migration 48: Users can't change their own role or profile link
--
-- The only UPDATE policy on profiles is "Users can update their own profile"
-- (USING auth.uid() = id, no WITH CHECK), and `authenticated` holds UPDATE on
-- every column. So any signed-in user could, through the Supabase API:
--   - set her own role to 'admin' or 'instructor', which every RLS policy and
--     every requireRole() guard trusts; or
--   - set linked_profile_id to someone else's profile, after which
--     getCurrentUserWithRole(), the proxy and promo_owner_id() all treat her
--     as that person.
--
-- No app code changes either column with a user's session: profile forms
-- write name, phone, birth date and avatar; roles and links are set by an
-- admin in the Supabase dashboard or SQL editor. This trigger refuses changes
-- to the two columns when the statement runs as a signed-in or anonymous API
-- user. The dashboard, the SQL editor (postgres), the service role and
-- foreign-key actions (ON DELETE SET NULL) run as other roles and pass.
--
-- Independent of Promo Studio, and safe to apply on its own, before 46 and 47.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY INVOKER (the default) on purpose: current_user must be the
-- caller's role, not the function owner.
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.linked_profile_id IS DISTINCT FROM OLD.linked_profile_id) THEN
    RAISE EXCEPTION 'Only an administrator can change a profile''s role or linked profile'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

COMMENT ON FUNCTION public.protect_profile_privileges() IS
  'Blocks API users from changing profiles.role or profiles.linked_profile_id (migration 48).';
