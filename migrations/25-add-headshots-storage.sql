-- Migration: Add storage bucket and policies for headshots
-- Description: Creates RLS policies for the headshots storage bucket
-- Date: 2025-01-16
--
-- IMPORTANT: Before running this migration, create the 'headshots' storage bucket
-- in your Supabase dashboard:
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "New bucket"
-- 3. Name it "headshots"
-- 4. Make it a PUBLIC bucket (so images can be viewed without authentication)
-- 5. Then run this migration

-- Policy 1: Allow all authenticated users to read/view headshots
-- (This allows any logged-in user to see profile photos)
CREATE POLICY "Allow authenticated users to read headshots"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'headshots');

-- Policy 2: Allow users to upload to their own folder only
-- (Each user can only upload to a folder matching their user ID)
CREATE POLICY "Allow users to upload their own headshot"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'headshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow users to update their own headshots
CREATE POLICY "Allow users to update their own headshot"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'headshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow users to delete their own headshots
CREATE POLICY "Allow users to delete their own headshot"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'headshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Note: The folder structure will be:
-- headshots/{user_id}/headshot.{ext}
--
-- Example: headshots/123e4567-e89b-12d3-a456-426614174000/headshot.jpg
