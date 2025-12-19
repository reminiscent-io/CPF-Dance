# Supabase Storage Bucket Setup for Assets

This guide walks you through setting up the Supabase storage bucket for the Assets feature, which allows instructors to upload promotional images and PDFs.

## Prerequisites

- Access to your Supabase project dashboard
- Admin access to your Supabase project

## Step 1: Apply Database Migration

Before creating the storage bucket, apply the database migration for the assets table:

1. Open your Supabase project at [https://supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** in the left sidebar
3. Open the file `migrations/17-add-assets-table.sql`
4. Copy the entire contents of the file
5. Paste it into the SQL Editor
6. Click **Run** to execute the migration

This creates:
- The `assets` table to store file metadata
- RLS policies for access control
- Indexes for performance

## Step 2: Create Storage Bucket

1. In your Supabase dashboard, navigate to **Storage** in the left sidebar
2. Click the **New bucket** button
3. Configure the bucket with these settings:

   ```
   Name: assets
   Public bucket: ✅ YES (checked)
   File size limit: 10 MB
   Allowed MIME types: (leave empty for default, or specify)
   ```

4. Click **Create bucket**

## Step 3: Configure Storage Policies

By default, public buckets allow anyone to view files but not upload. We need to add policies to allow instructors to upload and delete their own files.

1. In the Storage section, click on the **assets** bucket
2. Click on the **Policies** tab
3. You should see the default policies. We need to add custom policies.

### Policy 1: Allow Authenticated Users to Upload

1. Click **New Policy**
2. Choose **For full customization** (not a template)
3. Configure:
   - **Policy name**: `Instructors can upload assets`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     auth.uid()::text = (storage.foldername(name))[1]
     AND (
       SELECT role FROM profiles WHERE id = auth.uid()
     ) IN ('instructor', 'admin')
     ```
   - **WITH CHECK expression**: (same as above)
     ```sql
     auth.uid()::text = (storage.foldername(name))[1]
     AND (
       SELECT role FROM profiles WHERE id = auth.uid()
     ) IN ('instructor', 'admin')
     ```
4. Click **Review** and then **Save policy**

### Policy 2: Allow Users to Delete Their Own Files

1. Click **New Policy** again
2. Choose **For full customization**
3. Configure:
   - **Policy name**: `Instructors can delete their own assets`
   - **Allowed operation**: `DELETE`
   - **Target roles**: `authenticated`
   - **USING expression**:
     ```sql
     auth.uid()::text = (storage.foldername(name))[1]
     OR (
       SELECT role FROM profiles WHERE id = auth.uid()
     ) = 'admin'
     ```
4. Click **Review** and then **Save policy**

### Policy 3: Allow Public Read Access

This should already exist since we created a public bucket, but if not:

1. Click **New Policy**
2. Choose **For full customization**
3. Configure:
   - **Policy name**: `Public access for all authenticated users`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `authenticated`
   - **USING expression**: `true`
4. Click **Review** and then **Save policy**

## Step 4: Verify Setup

Test the setup by:

1. Log into your application as an instructor
2. Navigate to **Assets** in the sidebar
3. Click **Upload Asset**
4. Upload a test image or PDF
5. Verify the asset appears in the list
6. Try deleting the asset
7. Log in as a dancer and verify you can view the assets but not delete them

## Folder Structure

The storage bucket organizes files by instructor:

```
assets/
├── {instructor_id_1}/
│   ├── 1234567890-abc123.jpg
│   ├── 1234567891-def456.pdf
│   └── ...
├── {instructor_id_2}/
│   ├── 1234567892-ghi789.png
│   └── ...
└── ...
```

This structure:
- Keeps files organized by instructor
- Enables RLS policies based on folder ownership
- Prevents filename conflicts between instructors

## Security Notes

- ✅ All authenticated users (instructors, dancers, admins) can **view** assets
- ✅ Only instructors and admins can **upload** assets
- ✅ Only the asset owner or admins can **delete** assets
- ✅ Files are stored in instructor-specific folders
- ✅ File size is limited to 10MB
- ✅ Only images and PDFs are allowed (enforced in API)
- ✅ RLS policies enforce access control at the storage level
- ✅ Database RLS policies enforce access control at the metadata level

## Troubleshooting

### Upload fails with "new row violates row-level security policy"

- Verify you ran the database migration (`17-add-assets-table.sql`)
- Check that your user has the `instructor` or `admin` role in the `profiles` table
- Verify the storage bucket policies are configured correctly

### Files not appearing after upload

- Check the browser console for errors
- Verify the storage bucket is set to **Public**
- Check that the `file_url` in the database matches the actual storage URL

### Delete fails with 403 Forbidden

- Verify you're the owner of the asset (`instructor_id` matches your user ID)
- Or verify you have the `admin` role
- Check the storage DELETE policy is configured correctly

### Images not loading

- Verify the bucket is **Public**
- Check that the `file_url` in the database is accessible
- Try accessing the URL directly in your browser

## MIME Types

The following file types are supported:

- **Images**: `image/jpeg`, `image/jpg`, `image/png`, `image/gif`, `image/webp`
- **Documents**: `application/pdf`

These are validated both client-side (in the upload modal) and server-side (in the API route).

## File Size Limits

- Maximum file size: **10MB**
- This is enforced both client-side and server-side
- You can adjust this in:
  - `components/UploadAssetModal.tsx` (line 37)
  - `app/api/assets/route.ts` (line 62)
  - Supabase Storage bucket settings

## Next Steps

After setup, you can:

- Upload promotional images for classes
- Share PDFs with dancers (schedules, forms, etc.)
- Use assets for social media promotion
- Reference assets when creating classes or communications

## Database Schema Reference

The `assets` table has the following structure:

```sql
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  instructor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

See `migrations/17-add-assets-table.sql` for the complete schema including RLS policies and indexes.
