-- Migration: Add Profile Linking Support
-- Purpose: Allow multiple auth accounts to link to a single primary profile
-- Use case: Users with multiple email logins want all data consolidated under one profile

-- Add linked_profile_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN linked_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for performance when checking linked profiles
CREATE INDEX idx_profiles_linked_profile_id ON public.profiles(linked_profile_id);

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.linked_profile_id IS
  'If set, this profile is linked to another primary profile. When user signs in with this account, system redirects all operations to the primary profile.';

-- Add constraint to prevent self-linking
ALTER TABLE public.profiles
ADD CONSTRAINT prevent_self_linking CHECK (id != linked_profile_id);

-- Add constraint to prevent circular linking (A -> B -> A)
-- Note: This only prevents direct circular links. More complex cycles would need application-level validation.
CREATE OR REPLACE FUNCTION check_circular_profile_link()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting a linked_profile_id, ensure the target isn't also linked back
  IF NEW.linked_profile_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM profiles
      WHERE id = NEW.linked_profile_id
      AND linked_profile_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular profile linking is not allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_linking
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_profile_link();

-- Verification query to check linked profiles
-- SELECT id, email, full_name, role, linked_profile_id
-- FROM profiles
-- WHERE linked_profile_id IS NOT NULL;
