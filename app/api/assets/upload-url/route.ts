import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUploadTarget, safeExtension } from '@/lib/storage/direct-upload'
import { ASSET_BUCKET, assetExtension, assetFileProblem, assetFolder } from '@/lib/asset-upload'

// POST /api/assets/upload-url - Where the browser should send a new asset file.
// Body: { fileName, contentType, size }. Then POST /api/assets with { path, title }.
export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()
    if (!profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const problem = assetFileProblem(body?.contentType, body?.size)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })

    const ext = safeExtension(body.fileName, assetExtension(body.contentType))
    const path = `${assetFolder(profile.id)}${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
    const target = await createUploadTarget(createAdminClient(), ASSET_BUCKET, path)
    return NextResponse.json({ target })
  } catch (error) {
    console.error('Error in POST /api/assets/upload-url:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
