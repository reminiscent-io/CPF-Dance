import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow studio, admin, and instructor roles
    if (!['studio', 'admin', 'instructor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('student_id')

    let query = supabase
      .from('notes')
      .select(`
        id,
        title,
        content,
        tags,
        visibility,
        created_at,
        updated_at,
        author_id,
        student:students!notes_student_id_fkey(
          id,
          profile:profiles!students_profile_id_fkey(full_name)
        ),
        author:profiles!notes_author_id_fkey(full_name),
        class:classes(title, start_time)
      `)
      .order('created_at', { ascending: false })

    // Admins can see ALL notes, studio users can only see shared_with_studio
    if (profile.role === 'studio') {
      query = query.eq('visibility', 'shared_with_studio')
    }
    // If admin or instructor, no visibility filter - they see everything

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: notes, error } = await query

    if (error) {
      console.error('Error fetching studio notes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Debug logging
    console.log('Studio Notes API - Role:', profile.role)
    console.log('Studio Notes API - Student ID filter:', studentId)
    console.log('Studio Notes API - Notes found:', notes?.length || 0)
    console.log('Studio Notes API - Notes:', JSON.stringify(notes, null, 2))

    return NextResponse.json({ notes: notes || [] })
  } catch (error) {
    console.error('Error in studio notes API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin and instructor roles to edit notes
    if (!['admin', 'instructor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { id, title, content, tags, visibility } = body

    if (!id || !content) {
      return NextResponse.json({ error: 'Note ID and content are required' }, { status: 400 })
    }

    // Update the note - only if user is the author
    const { data: note, error } = await supabase
      .from('notes')
      .update({
        title,
        content,
        tags: tags || [],
        visibility
      })
      .eq('id', id)
      .eq('author_id', profile.id) // Only allow editing own notes
      .select(`
        id,
        title,
        content,
        tags,
        visibility,
        created_at,
        updated_at,
        author_id,
        student:students!notes_student_id_fkey(
          id,
          profile:profiles!students_profile_id_fkey(full_name)
        ),
        author:profiles!notes_author_id_fkey(full_name),
        class:classes(title, start_time)
      `)
      .single()

    if (error) {
      console.error('Error updating note:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!note) {
      return NextResponse.json({ error: 'Note not found or you do not have permission to edit it' }, { status: 404 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error in studio notes PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only allow admin and instructor roles to delete notes
    if (!['admin', 'instructor'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Delete the note - only if user is the author
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('author_id', profile.id) // Only allow deleting own notes

    if (error) {
      console.error('Error deleting note:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in studio notes DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
