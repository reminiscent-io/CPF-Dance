import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent, requireDancer } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const profile = await requireDancer()
    const supabase = await createClient()

    const now = new Date().toISOString()

    const { count: upcomingClassesCount } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .gte('classes.start_time', now)
      .eq('classes.is_cancelled', false)

    const { count: totalClassesCount } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .eq('attendance_status', 'present')

    const { count: recentNotesCount } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .neq('author_id', profile.id)
      .in('visibility', ['shared_with_student', 'shared_with_guardian'])
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const { data: nextClass } = await supabase
      .from('enrollments')
      .select(`
        id,
        classes (
          id,
          title,
          description,
          location,
          start_time,
          end_time,
          studios (
            name
          )
        )
      `)
      .eq('student_id', student.id)
      .gte('classes.start_time', now)
      .eq('classes.is_cancelled', false)
      .order('classes(start_time)', { ascending: true })
      .limit(1)
      .single()

    const { data: recentNotes } = await supabase
      .from('notes')
      .select(`
        id,
        title,
        content,
        tags,
        created_at,
        author_id,
        class_id,
        classes (
          title
        )
      `)
      .eq('student_id', student.id)
      .neq('author_id', profile.id)
      .in('visibility', ['shared_with_student', 'shared_with_guardian'])
      .order('created_at', { ascending: false })
      .limit(3)

    const authorIds = [...new Set(recentNotes?.map(n => n.author_id) || [])]
    let authorMap = new Map()
    
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', authorIds)
      
      authorMap = new Map(authors?.map(a => [a.id, a.full_name]) || [])
    }

    const notesWithAuthors = recentNotes?.map(note => ({
      ...note,
      author_name: authorMap.get(note.author_id) || 'Instructor'
    })) || []

    return NextResponse.json({
      stats: {
        upcoming_classes: upcomingClassesCount || 0,
        total_classes_attended: totalClassesCount || 0,
        recent_notes: recentNotesCount || 0
      },
      next_class: nextClass?.classes || null,
      recent_notes: notesWithAuthors
    })
  } catch (error) {
    console.error('Error fetching dancer stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
