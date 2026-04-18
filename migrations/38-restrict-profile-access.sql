-- Migration 38: Restrict profile PII to related parties and staff
--
-- Context: Prior to this migration, the `profiles` table had a policy
-- "Anyone can view profiles" USING (true), which let every authenticated
-- user read every profile row — including email, phone, date_of_birth,
-- and guardian_id. That's unnecessary exposure of PII for dancers, who
-- only need a small, non-sensitive directory of names and avatars to
-- render notes, classes, and instructor lists.
--
-- This migration:
--   1. Adds a SECURITY DEFINER helper `can_view_profile(p_target_id)`
--      that centralises the "who can see whom" logic without
--      recursing into RLS on profiles (see migration 30 for the same
--      pattern applied to classes).
--   2. Drops the old permissive SELECT policies on profiles and
--      replaces them with a single scoped policy built on the helper.
--   3. Creates a `public_profiles` view exposing only id, full_name,
--      avatar_url, role — the fields the app actually needs for
--      directory-style joins. The view uses `security_invoker = off`
--      so it runs as the view owner and bypasses RLS on the underlying
--      profiles table. Authenticated users get SELECT on the view.
--
-- Who can see a full profile row after this migration:
--   - The user themselves
--   - Their guardian (via profiles.guardian_id or students.guardian_id)
--   - Their ward(s), by the same two paths
--   - Any instructor or admin
--
-- Everyone else queries `public_profiles` for non-sensitive fields.

-- =====================================================
-- PART 1: HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_view_profile(p_target_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Self
  IF p_target_id = v_uid THEN
    RETURN TRUE;
  END IF;

  -- Instructor or admin: full roster access
  SELECT role::text INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role IN ('instructor', 'admin') THEN
    RETURN TRUE;
  END IF;

  -- Target is my guardian (profiles.guardian_id)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_uid AND guardian_id = p_target_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- I am guardian of target (profiles.guardian_id)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_target_id AND guardian_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  -- Target is my guardian (via students table)
  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE profile_id = v_uid AND guardian_id = p_target_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- I am guardian of a student linked to target (via students table)
  IF EXISTS (
    SELECT 1 FROM public.students
    WHERE profile_id = p_target_id AND guardian_id = v_uid
  ) THEN
    RETURN TRUE;
  END IF;

  -- Linked profiles: my profile points to target as primary, or target points to me.
  -- Keeps the account-merge flow in getCurrentUserWithRole() working.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id = v_uid AND linked_profile_id = p_target_id)
       OR (id = p_target_id AND linked_profile_id = v_uid)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_profile(UUID) TO authenticated;

COMMENT ON FUNCTION public.can_view_profile(UUID) IS
  'Returns TRUE when the current auth.uid() may view the full PII of the target profile. Uses SECURITY DEFINER to avoid RLS recursion on profiles.';

-- =====================================================
-- PART 2: REPLACE PROFILE SELECT POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (public.can_view_profile(id));

COMMENT ON POLICY "profiles_select_policy" ON public.profiles IS
  'Profiles carry PII (email, phone, DOB). Access is limited to self, guardian/ward links, and instructor/admin staff. Directory lookups should use the public_profiles view instead.';

-- =====================================================
-- PART 3: PUBLIC DIRECTORY VIEW
-- =====================================================

DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
WITH (security_invoker = false, security_barrier = true) AS
SELECT id, full_name, avatar_url, role
FROM public.profiles;

-- The view runs as the owner (postgres, BYPASSRLS), intentionally
-- bypassing the profiles RLS policy above so that directory-style
-- joins (instructor names on classes, author avatars on notes) work
-- for any authenticated user — without ever exposing PII columns.
GRANT SELECT ON public.public_profiles TO authenticated;

COMMENT ON VIEW public.public_profiles IS
  'Non-sensitive directory view of profiles (id, full_name, avatar_url, role). Safe to join to from any authenticated context. Use the profiles table directly only when PII is required and the caller is authorised.';
