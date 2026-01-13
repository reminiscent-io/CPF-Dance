import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent, requireDancer } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const profile = await requireDancer()
    const supabase = await createClient()

    const { data: notes, error: notesError} = await supabase
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
        class_id,
        personal_class_id,
        is_pinned,
        pin_order,
        classes (
          id,
          title,
          start_time
        ),
        personal_classes (
          id,
          title,
          start_time
        )
      `)
      .eq('student_id', student.id)
      .order('is_pinned', { ascending: false, nullsFirst: false })
      .order('pin_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (notesError) {
      return NextResponse.json({ error: notesError.message }, { status: 500 })
    }

    const authorIds = [...new Set(notes?.map(n => n.author_id) || [])]
    const { data: authors } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', authorIds)

    const authorMap = new Map(
      authors?.map(a => [a.id, { full_name: a.full_name, role: a.role }]) || []
    )

    const notesWithAuthors = notes?.map(note => {
      const author = authorMap.get(note.author_id)
      return {
        ...note,
        author_name: author?.full_name || 'Unknown',
        author_role: author?.role || 'unknown',
        is_personal: note.author_id === profile.id,
        is_shared: note.visibility !== 'private'
      }
    }) || []

    return NextResponse.json({ notes: notesWithAuthors })
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const profile = await requireDancer()
    const supabase = await createClient()

    const body = await request.json()
    const { title, content, tags, class_id, personal_class_id, visibility } = body

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data: note, error: insertError } = await supabase
      .from('notes')
      .insert({
        author_id: profile.id,
        student_id: student.id,
        title,
        content,
        tags: tags || [],
        class_id: class_id || null,
        personal_class_id: personal_class_id || null,
        visibility: visibility || 'shared_with_instructor'
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await requireDancer()
    const supabase = await createClient()

    const body = await request.json()
    const { id, title, content, tags, class_id, personal_class_id, visibility } = body

    if (!id || !content) {
      return NextResponse.json({ error: 'ID and content are required' }, { status: 400 })
    }

    const { data: note, error: updateError } = await supabase
      .from('notes')
      .update({
        title,
        content,
        tags: tags || [],
        class_id: class_id || null,
        personal_class_id: personal_class_id || null,
        visibility: visibility || 'shared_with_instructor'
      })
      .eq('id', id)
      .eq('author_id', profile.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const profile = await requireDancer()
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .eq('author_id', profile.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
