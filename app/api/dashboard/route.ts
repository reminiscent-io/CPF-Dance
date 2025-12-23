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

    const now = new Date().toISOString()
    const { count: upcomingClasses } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', now)
      .eq('is_cancelled', false)

    const { data: nextClass } = await supabase
      .from('classes')
      .select(`
        id,
        title,
        start_time,
        studio:studios(name)
      `)
      .gte('start_time', now)
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

    const recentActivity = [
      ...(recentEnrollments || []).map(e => ({
        id: e.id,
        type: 'enrollment' as const,
        description: `${(e.student as any)?.[0]?.profile?.[0]?.full_name} enrolled in ${(e.class as any)?.[0]?.title}`,
        timestamp: e.enrolled_at,
        student_name: (e.student as any)?.[0]?.profile?.[0]?.full_name
      })),
      ...(recentNotes || []).map(n => ({
        id: n.id,
        type: 'note' as const,
        description: `Note added for ${(n.student as any)?.[0]?.profile?.[0]?.full_name}${n.title ? `: ${n.title}` : ''}`,
        timestamp: n.created_at,
        student_name: (n.student as any)?.[0]?.profile?.[0]?.full_name
      })),
      ...(recentPayments || []).map(p => ({
        id: p.id,
        type: 'payment' as const,
        description: `Payment ${p.payment_status} from ${(p.student as any)?.[0]?.profile?.[0]?.full_name}: $${p.amount}`,
        timestamp: p.transaction_date,
        student_name: (p.student as any)?.[0]?.profile?.[0]?.full_name
      }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

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

    return NextResponse.json({ stats, recent_activity: recentActivity, next_class: nextClassData })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
