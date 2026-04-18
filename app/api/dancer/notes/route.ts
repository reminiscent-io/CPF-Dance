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
        classes (
          id,
          title,
          start_time
        )
      `)
      .eq('student_id', student.id)
      // SECURITY: Dancers see notes they authored OR notes shared with them, but NOT instructors' private notes
      .or(`author_id.eq.${profile.id},visibility.in.(shared_with_student,shared_with_guardian,shared_with_instructor)`)
      .order('created_at', { ascending: false })

    if (notesError) {
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    const authorIds = [...new Set(notes?.map(n => n.author_id) || [])]
    const { data: authors } = await supabase
      .from('public_profiles')
      .select('id, full_name, role, avatar_url')
      .in('id', authorIds)

    const authorMap = new Map(
      authors?.map(a => [a.id, { full_name: a.full_name, role: a.role, avatar_url: a.avatar_url }]) || []
    )

    // Fetch personal_classes separately rather than via PostgREST embed:
    // the FK from notes.personal_class_id was added directly in production
    // and isn't reliably present in PostgREST's schema cache, which silently
    // breaks the whole query when requested as an embed.
    const personalClassIds = [...new Set(
      notes?.map(n => n.personal_class_id).filter((id): id is string => !!id) || []
    )]
    const personalClassMap = new Map<string, { id: string; title: string; start_time: string }>()
    if (personalClassIds.length > 0) {
      const { data: personalClasses } = await supabase
        .from('personal_classes')
        .select('id, title, start_time')
        .in('id', personalClassIds)
      personalClasses?.forEach(pc => personalClassMap.set(pc.id, pc))
    }

    const notesWithAuthors = notes?.map(note => {
      const author = authorMap.get(note.author_id)
      const personalClass = note.personal_class_id ? personalClassMap.get(note.personal_class_id) : null
      return {
        ...note,
        personal_classes: personalClass || null,
        author_name: author?.full_name || 'Unknown',
        author_role: author?.role || 'unknown',
        author_avatar_url: author?.avatar_url || null,
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
      console.error('Error creating note:', insertError)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
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
      console.error('Error updating note:', updateError)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
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
      console.error('Error deleting note:', deleteError)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
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
