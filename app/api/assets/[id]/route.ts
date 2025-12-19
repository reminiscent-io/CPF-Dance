import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'

// DELETE /api/assets/[id] - Delete asset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: assetId } = await params
    const supabase = await createClient()

    // Fetch the asset to verify ownership and get file path
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', assetId)
      .single()

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Check if user can delete (must be owner or admin)
    if (asset.instructor_id !== profile.id && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Extract file path from URL
    // URL format: https://.../storage/v1/object/public/assets/{user_id}/{filename}
    const urlParts = asset.file_url.split('/assets/')
    const filePath = urlParts[1] // This will be like "user_id/filename"

    // Delete from storage
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('assets')
        .remove([filePath])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue anyway to delete database record
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', assetId)

    if (deleteError) {
      console.error('Error deleting asset from database:', deleteError)
      return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/assets/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
