import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent, requireDancer } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    console.log('[Dancer Stats] Starting request...')
    const student = await getCurrentDancerStudent()
    console.log('[Dancer Stats] Student:', student)
    const profile = await requireDancer()
    console.log('[Dancer Stats] Profile:', profile)
    const supabase = await createClient()

    const now = new Date().toISOString()

    // Count upcoming enrolled classes
    const { count: upcomingEnrolledCount } = await supabase
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .gte('classes.start_time', now)
      .eq('classes.is_cancelled', false)

    // Count upcoming personal classes
    const { count: upcomingPersonalCount } = await supabase
      .from('personal_classes')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .gte('start_time', now)

    // Total upcoming classes (enrolled + personal)
    const upcomingClassesCount = (upcomingEnrolledCount || 0) + (upcomingPersonalCount || 0)

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

    // Get next enrolled class
    const { data: nextEnrolledClass } = await supabase
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

    // Get next personal class
    const { data: nextPersonalClass } = await supabase
      .from('personal_classes')
      .select('*')
      .eq('student_id', student.id)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(1)
      .single()

    // Determine which class is actually next
    let nextClass = null
    if (nextEnrolledClass?.classes && nextPersonalClass) {
      // Compare timestamps to find the soonest
      const enrolledTime = new Date(nextEnrolledClass.classes.start_time).getTime()
      const personalTime = new Date(nextPersonalClass.start_time).getTime()
      if (personalTime < enrolledTime) {
        nextClass = {
          id: nextPersonalClass.id,
          title: nextPersonalClass.title,
          description: null,
          location: nextPersonalClass.location,
          start_time: nextPersonalClass.start_time,
          end_time: nextPersonalClass.end_time,
          studios: nextPersonalClass.instructor_name ? { name: nextPersonalClass.instructor_name } : null
        }
      } else {
        nextClass = nextEnrolledClass.classes
      }
    } else if (nextEnrolledClass?.classes) {
      nextClass = nextEnrolledClass.classes
    } else if (nextPersonalClass) {
      nextClass = {
        id: nextPersonalClass.id,
        title: nextPersonalClass.title,
        description: null,
        location: nextPersonalClass.location,
        start_time: nextPersonalClass.start_time,
        end_time: nextPersonalClass.end_time,
        studios: nextPersonalClass.instructor_name ? { name: nextPersonalClass.instructor_name } : null
      }
    }

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
        upcoming_classes: upcomingClassesCount,
        total_classes_attended: totalClassesCount || 0,
        recent_notes: recentNotesCount || 0
      },
      next_class: nextClass,
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
