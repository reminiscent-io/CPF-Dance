-- Migration 57: Users can't make themselves someone's guardian or ward
--
-- can_view_profile() hands over a profile's email, phone and birth date to
-- anyone on the other end of a guardian link:
--   profiles.guardian_id  (either direction)
--   students.guardian_id + students.profile_id  (either direction)
-- and every one of those columns was writable by the people the link was
-- meant to vouch for:
--   - "Users can update their own profile" lets any signed-in user set
--     profiles.guardian_id to any profile id (public_profiles lists them all).
--     protect_profile_privileges() (migration 48) guarded role and
--     linked_profile_id, not guardian_id.
--   - "Dancers can update their own student record" lets a dancer set
--     students.guardian_id on her own row.
--   - "Guardians can update their linked student records" checks only that
--     guardian_id stays hers, so a guardian can repoint students.profile_id
--     at anyone.
--   - handle_new_user() copied guardian_id straight out of signup metadata,
--     which the caller of supabase.auth.signUp() writes.
-- Point any of them at a UUID from public_profiles and that person's full
-- profile reads back.
--
-- After this migration the links are staff-set only:
--   - profiles.guardian_id joins role and linked_profile_id: no API user may
--     change it (the dashboard, SQL editor and service role still can).
--   - students.guardian_id and students.profile_id change through the API
--     only for instructors and admins (/api/students, the link and merge
--     routes). Dancers and guardians keep editing every other column.
--   - Signup no longer reads guardian_id from metadata. A new profile and
--     student start with no guardian; the instructor links one.
--
-- Links forged before this migration still grant access. Look for them with:
--   SELECT p.id, p.full_name, p.guardian_id, g.full_name, g.role
--     FROM profiles p JOIN profiles g ON g.id = p.guardian_id;
--   SELECT s.id, s.profile_id, s.guardian_id, g.full_name, g.role
--     FROM students s JOIN profiles g ON g.id = s.guardian_id;
-- and clear any that aren't a real guardian.
--
-- Safe to re-run.

-- 1. profiles: guardian_id is as protected as role and linked_profile_id.
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
          OR NEW.linked_profile_id IS DISTINCT FROM OLD.linked_profile_id
          OR NEW.guardian_id IS DISTINCT FROM OLD.guardian_id) THEN
    RAISE EXCEPTION 'Only an administrator can change a profile''s role, linked profile or guardian'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protect_profile_privileges() IS
  'Blocks API users from changing profiles.role, linked_profile_id or guardian_id (migrations 48, 57).';

-- 2. students: only instructors and admins move guardian_id or profile_id.
CREATE OR REPLACE FUNCTION public.protect_student_links()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY INVOKER, as above. public.user_role() is SECURITY DEFINER, so the
-- role lookup doesn't recurse into profiles RLS.
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND (NEW.guardian_id IS DISTINCT FROM OLD.guardian_id
          OR NEW.profile_id IS DISTINCT FROM OLD.profile_id)
     AND COALESCE(public.user_role(), '') NOT IN ('instructor', 'admin') THEN
    RAISE EXCEPTION 'Only an instructor can change a student''s guardian or linked profile'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_student_links ON public.students;
CREATE TRIGGER protect_student_links
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.protect_student_links();

COMMENT ON FUNCTION public.protect_student_links() IS
  'Blocks dancers and guardians from changing students.guardian_id or profile_id; instructors, admins and the service role pass (migration 57).';

-- 3. Signup: never take a guardian from user-supplied metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get role from metadata, default to 'dancer' if not provided.
  -- SECURITY: clamp self-service signups to non-privileged roles.
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dancer');
  IF user_role NOT IN ('dancer', 'guardian') THEN
    user_role := 'dancer';
  END IF;

  -- SECURITY: no guardian_id from metadata. The signer-up writes it, and a
  -- guardian link exposes both profiles (can_view_profile). Staff set it.
  INSERT INTO public.profiles (id, email, phone, full_name, role, consent_given)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role::public.user_role,
    false
  );

  IF user_role = 'dancer' THEN
    INSERT INTO public.students (profile_id, is_active)
    VALUES (NEW.id, true);
  END IF;

  RETURN NEW;
END;
$$;
