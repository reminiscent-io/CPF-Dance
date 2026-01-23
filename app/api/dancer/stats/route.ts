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

    // Count past enrolled classes (where class start_time is in the past)
    const { count: pastEnrolledCount } = await supabase
      .from('enrollments')
      .select('id, classes!inner(start_time)', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .lt('classes.start_time', now)

    // Count past personal classes
    const { count: pastPersonalCount } = await supabase
      .from('personal_classes')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .lt('start_time', now)

    // Total past classes (enrolled + personal)
    const totalClassesCount = (pastEnrolledCount || 0) + (pastPersonalCount || 0)

    // Count all instructor notes shared with student (no time limit)
    const { count: instructorNotesCount } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', student.id)
      .neq('author_id', profile.id)
      .in('visibility', ['shared_with_student', 'shared_with_guardian'])

    // Get upcoming enrolled classes (next 5)
    const { data: upcomingEnrolledClasses } = await supabase
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
          class_type,
          studios (
            name
          )
        )
      `)
      .eq('student_id', student.id)
      .gte('classes.start_time', now)
      .eq('classes.is_cancelled', false)
      .order('classes(start_time)', { ascending: true })
      .limit(5)

    // Get upcoming personal classes (next 5)
    const { data: upcomingPersonalClasses } = await supabase
      .from('personal_classes')
      .select('*')
      .eq('student_id', student.id)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(5)

    // Merge and sort all upcoming classes
    const allUpcomingClasses: any[] = []
    
    upcomingEnrolledClasses?.forEach(enrollment => {
      const cls = Array.isArray(enrollment.classes) ? enrollment.classes[0] : enrollment.classes
      if (cls) {
        allUpcomingClasses.push({
          id: cls.id,
          title: cls.title,
          description: cls.description,
          location: cls.location,
          start_time: cls.start_time,
          end_time: cls.end_time,
          class_type: cls.class_type,
          studios: cls.studios
        })
      }
    })

    upcomingPersonalClasses?.forEach(pc => {
      allUpcomingClasses.push({
        id: pc.id,
        title: pc.title,
        description: null,
        location: pc.location,
        start_time: pc.start_time,
        end_time: pc.end_time,
        class_type: 'private',
        studios: pc.instructor_name ? { name: pc.instructor_name } : null
      })
    })

    // Sort by start time and take first 5
    allUpcomingClasses.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    const upcomingClasses = allUpcomingClasses.slice(0, 5)

    // Get instructor notes (shared with student)
    const { data: instructorNotes } = await supabase
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

    // Get dancer's personal notes
    const { data: personalNotes } = await supabase
      .from('dancer_notes')
      .select(`
        id,
        title,
        content,
        tags,
        created_at,
        is_private
      `)
      .eq('dancer_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(3)

    // Combine all notes with proper type markers
    const allNotes: any[] = []

    // Add instructor notes
    const authorIds = [...new Set(instructorNotes?.map(n => n.author_id) || [])]
    let authorMap = new Map()
    
    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds)

      authorMap = new Map(authors?.map(a => [a.id, { full_name: a.full_name, avatar_url: a.avatar_url }]) || [])
    }

    instructorNotes?.forEach(note => {
      const author = authorMap.get(note.author_id)
      allNotes.push({
        ...note,
        author_name: author?.full_name || 'Instructor',
        author_avatar_url: author?.avatar_url || null,
        is_personal: false
      })
    })

    // Add personal notes
    personalNotes?.forEach(note => {
      allNotes.push({
        ...note,
        author_id: profile.id,
        author_name: profile.full_name,
        author_avatar_url: profile.avatar_url || null,
        is_personal: true,
        class_id: null,
        classes: null
      })
    })

    // Sort by created_at and take the most recent (limit to 3)
    allNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const recentNotesWithType = allNotes.slice(0, 3)

    return NextResponse.json({
      stats: {
        upcoming_classes: upcomingClassesCount,
        total_classes_attended: totalClassesCount || 0,
        recent_notes: instructorNotesCount || 0
      },
      upcoming_classes: upcomingClasses,
      recent_notes: recentNotesWithType
    })
  } catch (error) {
    console.error('Error fetching dancer stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
