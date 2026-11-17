import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { isPathUnder } from '@/lib/storage/direct-upload'
import { ASSET_BUCKET, assetFileProblem, assetFolder } from '@/lib/asset-upload'

// GET /api/assets - Fetch all assets
export async function GET(request: NextRequest) {
  try {
    // Require authentication (any authenticated user can view assets)
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: assets, error } = await supabase
      .from('assets')
      .select(`
        *,
        instructor:profiles!assets_instructor_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assets:', error)
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
    }

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error in GET /api/assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/assets - Save an asset the browser already sent to Storage.
// Body: { path, title }, with `path` from POST /api/assets/upload-url. The file
// never passes through here: Vercel caps request bodies at 4.5 MB.
export async function POST(request: NextRequest) {
  try {
    // Require instructor or admin role
    const profile = await getCurrentUserWithRole()
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const title = typeof body?.title === 'string' ? body.title : ''
    const filePath = body?.path

    if (!title || !isPathUnder(filePath, assetFolder(profile.id))) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // The path is in her own folder, so the service role may read and clean it up.
    const admin = createAdminClient()

    // Trust what Storage holds, not what the browser said it would send.
    const { data: stored, error: infoError } = await admin.storage.from(ASSET_BUCKET).info(filePath)
    if (infoError || !stored) {
      return NextResponse.json({ error: 'The file didn’t arrive. Try uploading it again.' }, { status: 400 })
    }
    const fileType = stored.contentType ?? ''
    const fileSize = stored.size ?? 0
    const problem = assetFileProblem(fileType, fileSize)
    if (problem) {
      await admin.storage.from(ASSET_BUCKET).remove([filePath])
      return NextResponse.json({ error: problem }, { status: 400 })
    }

    const supabase = await createClient()

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(ASSET_BUCKET)
      .getPublicUrl(filePath)

    // Save metadata to database
    const { data: asset, error: dbError } = await supabase
      .from('assets')
      .insert({
        title,
        file_url: publicUrl,
        file_type: fileType,
        file_size: fileSize,
        instructor_id: profile.id
      })
      .select(`
        *,
        instructor:profiles!assets_instructor_id_fkey(full_name)
      `)
      .single()

    if (dbError) {
      console.error('Error saving asset metadata:', dbError)

      // Clean up uploaded file if database insert fails
      await admin.storage.from(ASSET_BUCKET).remove([filePath])

      return NextResponse.json({ error: 'Failed to save asset metadata' }, { status: 500 })
    }

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
