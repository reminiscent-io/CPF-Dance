# Asset Integration Guide for Class Creation/Editing

This guide explains how to integrate asset selection and upload functionality into your class creation and editing modals.

## What's Been Done

✅ **Database Migration Created**: `migrations/14-add-asset-to-classes.sql`
- Added `assets` table with RLS policies
- Added `asset_id` column to `classes` table
- Created necessary indexes

✅ **AssetSelector Component**: `/components/AssetSelector.tsx`
- Allows selecting existing assets from your Assets library
- Supports uploading new assets directly
- Shows asset previews (images and PDFs)
- Responsive grid layout

✅ **API Updates**:
- `GET /api/classes` - Now includes asset data in response
- `POST /api/classes` - Accepts `asset_id` parameter
- `GET /api/classes/[id]` - Includes asset data
- `PATCH /api/classes/[id]` - Accepts `asset_id` parameter

## Integration Steps

### Step 1: Apply Database Migration

Run the migration in your Supabase SQL Editor:

```bash
# In Supabase Dashboard > SQL Editor
# Copy and run the contents of migrations/14-add-asset-to-classes.sql
```

### Step 2: Update Class Types

Add `asset_id` to your class type definition in `/lib/types/index.ts`:

```typescript
export interface Class {
  id: string
  instructor_id: string
  studio_id: string | null
  class_type: ClassType
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  max_capacity: number | null
  // ... existing fields ...
  asset_id: string | null  // ADD THIS
  asset?: {  // ADD THIS (returned from API)
    id: string
    title: string
    file_url: string
    file_type: string
  } | null
}

export interface CreateClassData {
  studio_id: string
  class_type: ClassType
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  max_capacity?: number
  // ... existing fields ...
  asset_id?: string | null  // ADD THIS
}
```

### Step 3: Update CreateClassModal

In `/app/(portal)/instructor/classes/page.tsx`, find the `CreateClassModal` component and add the AssetSelector:

```typescript
// At the top of the file, add the import:
import { AssetSelector } from '@/components/AssetSelector'

// In the CreateClassModal component:
function CreateClassModal({ studios, onClose, onSubmit }: CreateClassModalProps) {
  // Add asset_id to formData state:
  const [formData, setFormData] = useState<CreateClassData & {
    newStudioName?: string
    asset_id?: string | null  // ADD THIS
  }>({
    studio_id: '',
    class_type: 'group',
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    max_capacity: undefined,
    pricing_model: 'per_person',
    cost_per_person: undefined,
    newStudioName: '',
    asset_id: null  // ADD THIS
  })

  // In the form JSX, add the AssetSelector (place it before the submit button):
  return (
    <Modal isOpen={true} onClose={onClose} title="Create Class" size="lg">
      <form onSubmit={handleSubmit}>
        {/* ... existing form fields ... */}

        {/* ADD THIS - Asset Selection Section */}
        <div className="mb-4">
          <AssetSelector
            selectedAssetId={formData.asset_id}
            onSelect={(assetId) => setFormData({ ...formData, asset_id: assetId })}
            label="Promotional Image/Document (Optional)"
            showUploadButton={true}
          />
        </div>

        {/* ... rest of form and submit button ... */}
      </form>
    </Modal>
  )
}
```

### Step 4: Update EditClassModal

Similarly, in the `EditClassModal` component in the same file:

```typescript
function EditClassModal({ classData, studios, onClose, onSubmit, onDelete }: EditClassModalProps) {
  // Add asset_id to formData initialization:
  const [formData, setFormData] = useState<CreateClassData & {
    newStudioName?: string
    actual_attendance_count?: number
    instructor_id?: string
    asset_id?: string | null  // ADD THIS
  }>({
    studio_id: classData.studio_id || '',
    class_type: classData.class_type,
    title: classData.title,
    description: classData.description || '',
    location: classData.location || '',
    start_time: convertUTCToET(classData.start_time),
    end_time: convertUTCToET(classData.end_time),
    max_capacity: classData.max_capacity || undefined,
    actual_attendance_count: classData.actual_attendance_count || undefined,
    // ... existing pricing fields ...
    newStudioName: '',
    instructor_id: (classData as any).instructor_id || undefined,
    asset_id: classData.asset_id || null  // ADD THIS
  })

  // In the form JSX, add the AssetSelector:
  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Class" size="lg">
      <form onSubmit={handleSubmit}>
        {/* ... existing form fields ... */}

        {/* ADD THIS - Asset Selection Section */}
        <div className="mb-4">
          <AssetSelector
            selectedAssetId={formData.asset_id}
            onSelect={(assetId) => setFormData({ ...formData, asset_id: assetId })}
            label="Promotional Image/Document (Optional)"
            showUploadButton={true}
          />
        </div>

        {/* ... rest of form and submit/delete buttons ... */}
      </form>
    </Modal>
  )
}
```

### Step 5: Display Assets on Class Cards (Optional)

To show the asset thumbnail on class cards in the class list view, update the class card rendering:

```typescript
// In the classes grid section:
{classes.map((cls: any) => (
  <Card key={cls.id} hover onClick={() => handleClassClick(cls)}>
    {/* ADD THIS - Show asset thumbnail if present */}
    {cls.asset && (
      <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden mb-3">
        {cls.asset.file_type.startsWith('image/') ? (
          <img
            src={cls.asset.file_url}
            alt={cls.asset.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <DocumentIcon className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>
    )}

    {/* ... rest of card content ... */}
  </Card>
))}
```

## Component Props Reference

### AssetSelector

```typescript
interface AssetSelectorProps {
  selectedAssetId?: string | null  // Currently selected asset ID
  onSelect: (assetId: string | null) => void  // Callback when asset is selected/removed
  label?: string  // Label text (default: "Promotional Image/Document")
  showUploadButton?: boolean  // Show "Upload New Asset" button (default: true)
}
```

## Features

1. **Select from Existing Assets**: Browse your asset library in a responsive grid
2. **Upload New Assets**: Upload directly from the class modal
3. **Preview**: See thumbnails for images and document icons for PDFs
4. **Remove**: Easily remove selected asset
5. **File Size Display**: Shows file size for each asset
6. **Responsive**: Works on mobile and desktop

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Create a class with an asset selected from library
- [ ] Create a class with a newly uploaded asset
- [ ] Edit a class and change its asset
- [ ] Edit a class and remove its asset
- [ ] Verify asset appears on class cards (if implemented)
- [ ] Test on mobile and desktop

## Troubleshooting

**Assets not loading?**
- Check that the migration ran successfully
- Verify RLS policies are enabled on the `assets` table
- Check browser console for errors

**Can't upload assets?**
- Ensure Supabase Storage bucket named "assets" exists and is public
- Check file size (must be under 10MB)
- Verify file type (only images and PDFs allowed)

**Asset not saving with class?**
- Check that `asset_id` is included in the form data
- Verify API is receiving the `asset_id` parameter
- Check Supabase logs for any errors

## Next Steps

After integration, you might want to:
- Add asset display to the dancer portal for public classes
- Show assets in email notifications
- Use assets for social media sharing
- Display assets in the class schedule view
