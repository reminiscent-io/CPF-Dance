import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'

// GET /api/assets - Fetch all assets
export async function GET(request: NextRequest) {
  try {
    // Require authentication (any authenticated user can view assets)
    const { user } = await getCurrentUserWithRole()
    if (!user) {
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Error in GET /api/assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/assets - Upload new asset
export async function POST(request: NextRequest) {
  try {
    // Require instructor or admin role
    const { user, profile } = await getCurrentUserWithRole()
    if (!user || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string

    if (!file || !title) {
      return NextResponse.json({ error: 'File and title are required' }, { status: 400 })
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images and PDFs are allowed.' }, { status: 400 })
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    const supabase = await createClient()

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assets')
      .getPublicUrl(filePath)

    // Save metadata to database
    const { data: asset, error: dbError } = await supabase
      .from('assets')
      .insert({
        title,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        instructor_id: user.id
      })
      .select(`
        *,
        instructor:profiles!assets_instructor_id_fkey(full_name)
      `)
      .single()

    if (dbError) {
      console.error('Error saving asset metadata:', dbError)

      // Clean up uploaded file if database insert fails
      await supabase.storage.from('assets').remove([filePath])

      return NextResponse.json({ error: 'Failed to save asset metadata' }, { status: 500 })
    }

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/assets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
