import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges } from '@/lib/auth/privileges'

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()
    
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const studentId = searchParams.get('student_id')
    const visibility = searchParams.get('visibility')
    const tag = searchParams.get('tag')

    let query = supabase
      .from('notes')
      .select(`
        *,
        student:students!notes_student_id_fkey(
          id,
          full_name,
          profile:profiles!students_profile_id_fkey(full_name, avatar_url)
        ),
        author:profiles!notes_author_id_fkey(full_name, avatar_url),
        class:classes(title, start_time)
      `)
      .order('created_at', { ascending: false })

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    if (visibility) {
      query = query.eq('visibility', visibility)
    }

    const { data: notes, error } = await query

    if (error) {
      console.error('Error fetching notes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let filteredNotes = notes || []

    if (tag && filteredNotes.length > 0) {
      filteredNotes = filteredNotes.filter(note => 
        note.tags && note.tags.includes(tag)
      )
    }

    return NextResponse.json({ notes: filteredNotes })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()
    
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can create notes for students' }, { status: 403 })
    }
    
    const supabase = await createClient()

    const body = await request.json()
    
    const {
      student_id,
      class_id,
      title,
      content,
      tags,
      visibility
    } = body

    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        author_id: profile.id,
        student_id,
        class_id,
        title,
        content,
        tags,
        visibility
      })
      .select(`
        *,
        student:students!notes_student_id_fkey(
          id,
          full_name,
          profile:profiles!students_profile_id_fkey(full_name, avatar_url)
        ),
        author:profiles!notes_author_id_fkey(full_name, avatar_url),
        class:classes(title, start_time)
      `)
      .single()

    if (error) {
      console.error('Error creating note:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
