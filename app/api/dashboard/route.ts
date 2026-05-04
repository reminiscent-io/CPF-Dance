import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireInstructor()
    
    const supabase = await createClient()

    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })

    const { count: activeStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const now = new Date()
    const nowISO = now.toISOString()
    
    // Get start and end of today in local timezone
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    
    const { count: upcomingClasses } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', nowISO)
      .eq('is_cancelled', false)

    // Get all of today's classes (including ones that already started today)
    const { data: todaysClasses } = await supabase
      .from('classes')
      .select(`
        id,
        title,
        start_time,
        end_time,
        class_type,
        studio:studios(name)
      `)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .eq('is_cancelled', false)
      .order('start_time', { ascending: true })

    // Get next upcoming class (after now)
    const { data: nextClass } = await supabase
      .from('classes')
      .select(`
        id,
        title,
        start_time,
        studio:studios(name)
      `)
      .gte('start_time', nowISO)
      .eq('is_cancelled', false)
      .order('start_time', { ascending: true })
      .limit(1)

    const { count: pendingRequests } = await supabase
      .from('private_lesson_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: unpaidInvoices } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending')

    const { data: recentEnrollments } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        student:students(
          profile:profiles!students_profile_id_fkey(full_name)
        ),
        class:classes(title)
      `)
      .order('enrolled_at', { ascending: false })
      .limit(5)

    const { data: recentNotes } = await supabase
      .from('notes')
      .select(`
        id,
        created_at,
        title,
        student:students(
          profile:profiles!students_profile_id_fkey(full_name)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    // Get detailed recent notes for display (limit to 3 most recent)
    const { data: detailedRecentNotes } = await supabase
      .from('notes')
      .select(`
        id,
        title,
        content,
        tags,
        created_at,
        author_id,
        student:students(
          id,
          profile:profiles!students_profile_id_fkey(full_name, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(3)

    // Get author info for detailed notes
    const authorIds = [...new Set(detailedRecentNotes?.map(n => n.author_id) || [])]
    let authorMap = new Map()

    if (authorIds.length > 0) {
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', authorIds)

      authorMap = new Map(authors?.map(a => [a.id, { full_name: a.full_name, avatar_url: a.avatar_url }]) || [])
    }

    const detailedNotesWithAuthors = detailedRecentNotes?.map(note => {
      const author = authorMap.get(note.author_id)
      const student = note.student as any
      return {
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        created_at: note.created_at,
        author_id: note.author_id,
        author_name: author?.full_name || 'Instructor',
        author_avatar_url: author?.avatar_url || null,
        student_name: student?.profile?.full_name || 'Unknown Student',
        student_avatar_url: student?.profile?.avatar_url || null
      }
    }) || []

    const { data: recentPayments } = await supabase
      .from('payments')
      .select(`
        id,
        transaction_date,
        amount,
        payment_status,
        student:students(
          profile:profiles!students_profile_id_fkey(full_name)
        )
      `)
      .order('transaction_date', { ascending: false })
      .limit(5)

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const { data: recentLessonRequests } = await supabase
      .from('private_lesson_requests')
      .select(`
        id,
        created_at,
        requested_focus,
        status,
        student:students(
          profile:profiles!students_profile_id_fkey(full_name)
        )
      `)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: recentRescheduleRequests } = await supabase
      .from('lesson_reschedule_requests')
      .select(`
        id,
        created_at,
        status,
        class:classes(start_time, title),
        student:students(
          profile:profiles!students_profile_id_fkey(full_name)
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    const { data: recentCancellations } = await supabase
      .from('classes')
      .select(`
        id,
        updated_at,
        title,
        class_type,
        is_cancelled,
        cancellation_reason,
        enrollments(student:students(profile:profiles!students_profile_id_fkey(full_name)))
      `)
      .eq('is_cancelled', true)
      .eq('class_type', 'private')
      .gte('updated_at', fourteenDaysAgo)
      .order('updated_at', { ascending: false })
      .limit(10)

    const recentActivity = [
      ...(recentEnrollments || []).map(e => {
        const studentName = (e.student as any)?.profile?.full_name || 'Unknown Student'
        const className = (e.class as any)?.title || 'Unknown Class'
        return {
          id: e.id,
          type: 'enrollment' as const,
          description: `${studentName} enrolled in ${className}`,
          timestamp: e.enrolled_at,
          student_name: studentName
        }
      }),
      ...(recentNotes || []).map(n => {
        const studentName = (n.student as any)?.profile?.full_name || 'Unknown Student'
        return {
          id: n.id,
          type: 'note' as const,
          description: `Note added for ${studentName}${n.title ? `: ${n.title}` : ''}`,
          timestamp: n.created_at,
          student_name: studentName
        }
      }),
      ...(recentPayments || []).map(p => {
        const studentName = (p.student as any)?.profile?.full_name || 'Unknown Student'
        return {
          id: p.id,
          type: 'payment' as const,
          description: `Payment ${p.payment_status} from ${studentName}: $${p.amount}`,
          timestamp: p.transaction_date,
          student_name: studentName
        }
      }),
      ...(recentLessonRequests || []).map(r => {
        const studentName = (r.student as any)?.profile?.full_name || 'Unknown Student'
        return {
          id: `request-${r.id}`,
          type: 'request' as const,
          description: `${studentName} requested a private lesson${r.requested_focus ? `: ${r.requested_focus}` : ''}`,
          timestamp: r.created_at,
          student_name: studentName,
          link: '/instructor/requests'
        }
      }),
      ...(recentRescheduleRequests || []).map(r => {
        const studentName = (r.student as any)?.profile?.full_name || 'Unknown Student'
        return {
          id: `reschedule-${r.id}`,
          type: 'reschedule_request' as const,
          description: `${studentName} asked to reschedule their lesson`,
          timestamp: r.created_at,
          student_name: studentName,
          link: '/instructor/schedule'
        }
      }),
      ...(recentCancellations || []).map(c => {
        const enrollment = (c.enrollments as any[])?.[0]
        const studentName = enrollment?.student?.profile?.full_name || 'Dancer'
        return {
          id: `cancel-${c.id}`,
          type: 'cancellation' as const,
          description: `${studentName}'s private lesson was cancelled${c.cancellation_reason ? ` — ${c.cancellation_reason}` : ''}`,
          timestamp: c.updated_at,
          student_name: studentName,
          link: '/instructor/schedule'
        }
      })
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 12)

    const stats = {
      total_students: totalStudents || 0,
      active_students: activeStudents || 0,
      upcoming_classes: upcomingClasses || 0,
      pending_requests: pendingRequests || 0,
      unpaid_invoices: unpaidInvoices || 0
    }

    const nextClassData = nextClass && nextClass.length > 0 ? {
      id: nextClass[0].id,
      title: nextClass[0].title,
      start_time: nextClass[0].start_time,
      studio_name: (nextClass[0].studio as any)?.name || 'Studio TBA'
    } : null

    const todaysClassesData = (todaysClasses || []).map(c => ({
      id: c.id,
      title: c.title,
      start_time: c.start_time,
      end_time: c.end_time,
      class_type: c.class_type,
      studio_name: (c.studio as any)?.name || 'Studio TBA'
    }))

    return NextResponse.json({
      stats,
      recent_activity: recentActivity,
      next_class: nextClassData,
      todays_classes: todaysClassesData,
      recent_notes: detailedNotesWithAuthors
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
