-- Migration: Add storage policies for assets bucket
-- Description: Creates RLS policies for the assets storage bucket
-- Date: 2024-12-19
-- NOTE: Run this AFTER creating the 'assets' storage bucket in Supabase dashboard

-- Policy 1: Allow all authenticated users to view/download assets
CREATE POLICY "Allow authenticated users to read assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'assets');

-- Policy 2: Allow instructors and admins to upload to their own folder
CREATE POLICY "Allow instructors to upload assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) IN ('instructor', 'admin')
);

-- Policy 3: Allow instructors to update their own assets, admins can update any
CREATE POLICY "Allow instructors to update their own assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- Policy 4: Allow instructors to delete their own assets, admins can delete any
CREATE POLICY "Allow instructors to delete their own assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
);
