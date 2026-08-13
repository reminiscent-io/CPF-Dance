-- Migration 45: Stop can_user_view_class() being usable as an enrollment oracle
--
-- Context: `can_user_view_class(class_id, user_id)` is a SECURITY DEFINER
-- helper whose only real caller is the `classes` RLS policy
-- "Students can view their classes", which invokes it as:
--
--   can_user_view_class(id, auth.uid())
--
-- The subject is therefore always the current user. But the function takes
-- that subject as a *parameter* rather than reading auth.uid() itself, and
-- Postgres grants EXECUTE to PUBLIC by default, so it is also reachable at
-- /rest/v1/rpc/can_user_view_class with an arbitrary user_id. Verified in
-- production: as the `anon` role, passing a real (class_id, profile_id) pair
-- returned TRUE, disclosing that a specific person is enrolled in a specific
-- class to anyone holding the publishable anon key.
--
-- No application code calls this function directly - it exists solely to
-- back the RLS policy - so constraining the subject to auth.uid() closes the
-- RPC path without changing any in-policy behaviour.
--
-- Grants are deliberately left alone. Revoking EXECUTE from `anon` looks
-- tempting, but `classes` also carries the permissive `classes_select_policy`
-- (is_public = true), so anonymous browsing of public classes evaluates the
-- policy OR-chain that contains this call. Losing EXECUTE would turn those
-- reads into "permission denied" errors rather than empty results.
--
-- Also pins search_path, which resolves linter 0011
-- (function_search_path_mutable) for this function. Volatility (STABLE) and
-- the #variable_conflict directive are preserved from the original.

CREATE OR REPLACE FUNCTION public.can_user_view_class(class_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
#variable_conflict use_variable
BEGIN
  -- The subject must be the caller. The only legitimate invocation passes
  -- auth.uid(); anything else is a direct RPC probe and gets nothing.
  IF user_id IS NULL OR user_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RETURN FALSE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM private_lesson_requests plr
    JOIN students s ON s.id = plr.student_id
    WHERE plr.scheduled_class_id = class_id
    AND (s.profile_id = user_id OR s.guardian_id = user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM enrollments e
    JOIN students s ON s.id = e.student_id
    WHERE e.class_id = class_id
    AND (s.profile_id = user_id OR s.guardian_id = user_id)
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.can_user_view_class(UUID, UUID) IS
  'RLS helper for classes: may the given user see the given class via an enrollment or private lesson request? SECURITY DEFINER to avoid recursing into RLS. The user_id argument must equal auth.uid() - the function refuses any other subject so it cannot be used as a membership oracle via /rest/v1/rpc/.';
