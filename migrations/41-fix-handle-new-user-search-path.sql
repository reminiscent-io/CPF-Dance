-- Migration 41: Fix "Database error saving new user" on signup
--
-- Symptom: all new dancer/guardian signups failed with
--   500: Database error saving new user
-- and those users then could not log in (their account was never created).
--
-- Root cause: migration 40 rewrote handle_new_user() via CREATE OR REPLACE
-- without a `SET search_path`. The function casts to the `public.user_role`
-- enum using an UNQUALIFIED type name (user_role::user_role). The trigger is
-- fired by GoTrue as `supabase_auth_admin`, whose search_path does NOT include
-- `public`, so the enum type could not be resolved at runtime:
--   ERROR: type "user_role" does not exist (SQLSTATE 42704)
-- That aborts the auth.users INSERT (everything in the signup transaction
-- rolls back), surfacing to the client as the 500 above. It did not show up in
-- local/SQL-editor testing because the postgres role has `public` on its
-- search_path, so the cast resolves there but not under GoTrue's role.
--
-- Fix: pin a deterministic search_path on the function (also the recommended
-- hardening for SECURITY DEFINER functions, matching can_view_profile in
-- migration 38) and schema-qualify the enum cast as defense-in-depth.
--
-- Apply via the Supabase SQL editor (no automated migration runner).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role TEXT;
  guardian_uuid UUID;
BEGIN
  -- Get role from metadata, default to 'dancer' if not provided.
  -- SECURITY: clamp self-service signups to non-privileged roles. Instructor
  -- and admin accounts are provisioned by an admin (e.g. the
  -- instructor-access-request flow), never via signup metadata.
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dancer');
  IF user_role NOT IN ('dancer', 'guardian') THEN
    user_role := 'dancer';
  END IF;

  -- Get guardian_id from metadata if provided
  guardian_uuid := (NEW.raw_user_meta_data->>'guardian_id')::UUID;

  -- Insert profile
  INSERT INTO public.profiles (id, email, phone, full_name, role, guardian_id, consent_given)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role::public.user_role,
    guardian_uuid,
    false
  );

  -- If role is dancer, also create student record with guardian_id
  IF user_role = 'dancer' THEN
    INSERT INTO public.students (profile_id, guardian_id, is_active)
    VALUES (NEW.id, guardian_uuid, true);
  END IF;

  RETURN NEW;
END;
$$;
