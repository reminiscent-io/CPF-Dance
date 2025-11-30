-- Add timezone support to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Add comment explaining the timezone field
COMMENT ON COLUMN profiles.timezone IS 'User preferred timezone (IANA timezone identifier, e.g., America/New_York, Europe/London, Asia/Tokyo)';

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_timezone ON profiles(timezone);
