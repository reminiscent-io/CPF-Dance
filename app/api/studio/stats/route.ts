import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudioAdmin } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireStudioAdmin()
    const supabase = await createClient()

    // Get total classes (you may want to filter by studio_id in the future)
    const { count: totalClasses } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })

    // Get total students
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get upcoming classes
    const { count: upcomingClasses } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .gte('start_time', new Date().toISOString())
      .eq('is_cancelled', false)

    // Get pending payments
    const { count: pendingPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'pending')

    // Get upcoming classes with details
    const { data: upcomingClassesData } = await supabase
      .from('classes')
      .select(`
        id,
        title,
        start_time,
        profiles!classes_instructor_id_fkey(full_name)
      `)
      .gte('start_time', new Date().toISOString())
      .eq('is_cancelled', false)
      .order('start_time', { ascending: true })
      .limit(10)

    const formattedClasses = upcomingClassesData?.map(cls => ({
      id: cls.id,
      title: cls.title,
      start_time: cls.start_time,
      instructor_name: (cls.profiles as any)?.full_name || 'Unknown'
    })) || []

    return NextResponse.json({
      stats: {
        total_classes: totalClasses || 0,
        total_students: totalStudents || 0,
        upcoming_classes: upcomingClasses || 0,
        pending_payments: pendingPayments || 0
      },
      upcoming_classes: formattedClasses
    })
  } catch (error) {
    console.error('Error fetching studio stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
