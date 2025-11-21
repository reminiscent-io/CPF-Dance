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

    if (profileError || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized - Instructors and Admins only' }, { status: 403 })
    }

    const body = await request.json()
    const { student_id, title, content, tags, class_id, visibility } = body

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    // student_id is now optional - allows notes for prospective students

    // Create the note (student_id can be null for prospective students)
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .insert({
        author_id: user.id,
        student_id: student_id || null,
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
      console.error('Supabase error creating note:', noteError)
      return NextResponse.json({
        error: noteError.message,
        details: noteError.details,
        hint: noteError.hint
      }, { status: 500 })
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

export async function PUT(request: Request) {
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

    if (profileError || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized - Instructors and Admins only' }, { status: 403 })
    }

    const body = await request.json()
    const { id, title, content, tags, class_id, visibility } = body

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Update the note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .update({
        title: title || null,
        content: content.trim(),
        tags: tags || [],
        class_id: class_id || null,
        visibility: visibility || 'shared_with_student',
      })
      .eq('id', id)
      .eq('author_id', user.id) // Ensure user can only edit their own notes
      .select()
      .single()

    if (noteError) {
      console.error('Supabase error updating note:', noteError)
      return NextResponse.json({
        error: noteError.message,
        details: noteError.details,
        hint: noteError.hint
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      note
    })
  } catch (error) {
    console.error('Error in PUT /api/instructor/notes:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
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

    if (profileError || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized - Instructors and Admins only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 })
    }

    // Delete the note
    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id) // Ensure user can only delete their own notes

    if (deleteError) {
      console.error('Supabase error deleting note:', deleteError)
      return NextResponse.json({
        error: deleteError.message,
        details: deleteError.details,
        hint: deleteError.hint
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Error in DELETE /api/instructor/notes:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
