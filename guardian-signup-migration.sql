-- Migration: Update signup flow to use age confirmation and guardian profiles
-- This removes date_of_birth and updates the auth trigger to handle guardians

-- Step 1: Ensure profiles table has guardian_id column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS guardian_id UUID REFERENCES profiles(id);

-- Step 2: You can optionally remove date_of_birth if you want (commented out for safety)
-- ALTER TABLE profiles DROP COLUMN IF EXISTS date_of_birth;

-- Step 3: Update the handle_new_user trigger to handle guardian_id from metadata
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_guardian_id UUID;
BEGIN
  -- Get role and guardian_id from user metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'dancer');
  user_guardian_id := (NEW.raw_user_meta_data->>'guardian_id')::UUID;

  -- Create profile
  INSERT INTO profiles (id, email, full_name, phone, role, guardian_id, consent_given)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    user_role,
    user_guardian_id,
    CASE WHEN user_guardian_id IS NULL THEN true ELSE false END
  );

  -- If role is dancer, create student record
  IF user_role = 'dancer' THEN
    INSERT INTO students (profile_id, guardian_id, is_active)
    VALUES (
      NEW.id,
      user_guardian_id,
      true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure the trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Step 5: Add index for guardian lookups
CREATE INDEX IF NOT EXISTS idx_profiles_guardian_id ON profiles(guardian_id);
CREATE INDEX IF NOT EXISTS idx_students_guardian_id ON students(guardian_id);

-- Step 6: Add comment explaining guardian flow
COMMENT ON COLUMN profiles.guardian_id IS 'Links to guardian profile for users under 13. Guardian profiles are created without auth accounts.';
