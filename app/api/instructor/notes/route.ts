import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user is an instructor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized - Instructors only' }, { status: 403 })
    }

    const body = await request.json()
    const { student_id, title, content, tags, class_id, visibility } = body

    if (!student_id || !content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Student ID and content are required' },
        { status: 400 }
      )
    }

    // Create the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        author_id: user.id,
        student_id,
        title: title || null,
        content: content.trim(),
        tags: tags || [],
        class_id: class_id || null,
        visibility: visibility || 'shared_with_student',
      })
      .select(`
        id,
        title,
        content,
        tags,
        created_at,
        updated_at,
        author_id,
        class_id,
        visibility
      `)
      .single()

    if (noteError) {
      console.error('Error creating note:', noteError)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      note
    })
  } catch (error) {
    console.error('Error in POST /api/instructor/notes:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
