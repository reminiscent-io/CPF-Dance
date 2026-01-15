import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    // Get total user counts by role
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('role, created_at')

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const usersByRole = profiles?.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    const totalUsers = profiles?.length || 0

    // Get new users this month
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const newUsersThisMonth = profiles?.filter(p =>
      new Date(p.created_at) >= firstOfMonth
    ).length || 0

    // Get total classes
    const { count: totalClasses, error: classesError } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })

    // Get total notes
    const { count: totalNotes, error: notesError } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })

    // Get notes created this month
    const { count: notesThisMonth, error: notesMonthError } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', firstOfMonth.toISOString())

    // Get total enrollments
    const { count: totalEnrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })

    // Get total payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, status')

    const totalRevenue = payments?.filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // Get total studio inquiries
    const { count: totalInquiries, error: inquiriesError } = await supabase
      .from('studio_inquiries')
      .select('*', { count: 'exact', head: true })

    // Get pending inquiries
    const { count: pendingInquiries, error: pendingError } = await supabase
      .from('studio_inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')

    // Get total waivers
    const { count: totalWaivers, error: waiversError } = await supabase
      .from('waivers')
      .select('*', { count: 'exact', head: true })

    // Get signed waivers
    const { count: signedWaivers, error: signedError } = await supabase
      .from('waivers')
      .select('*', { count: 'exact', head: true })
      .not('signed_at', 'is', null)

    // Get total lesson pack purchases
    const { data: lessonPacks, error: packsError } = await supabase
      .from('lesson_pack_purchases')
      .select('lessons_purchased, lessons_used')

    const totalLessonsPurchased = lessonPacks?.reduce((sum, pack) =>
      sum + pack.lessons_purchased, 0) || 0
    const totalLessonsUsed = lessonPacks?.reduce((sum, pack) =>
      sum + pack.lessons_used, 0) || 0

    // Get trend data for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Notes trend
    const { data: notesData } = await supabase
      .from('notes')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const notesTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const dateStr = date.toISOString().split('T')[0]
      const count = notesData?.filter(n => n.created_at.startsWith(dateStr)).length || 0
      return { date: dateStr, count }
    })

    // Revenue trend
    const { data: revenueData } = await supabase
      .from('payments')
      .select('transaction_date, amount')
      .eq('payment_status', 'paid')
      .gte('transaction_date', thirtyDaysAgo.toISOString())

    const revenueTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const dateStr = date.toISOString().split('T')[0]
      const amount = revenueData?.filter(p => p.transaction_date.startsWith(dateStr))
        .reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      return { date: dateStr, amount }
    })

    // Get recent pending inquiries
    const { data: recentInquiries } = await supabase
      .from('studio_inquiries')
      .select('id, name, email, created_at, status')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(5)

    // Get recent pending waivers
    const { data: recentWaivers } = await supabase
      .from('waivers')
      .select(`
        id,
        created_at,
        students!waivers_student_id_fkey(
          profile:profiles!students_profile_id_fkey(full_name)
        ),
        waiver_templates!waivers_template_id_fkey(title)
      `)
      .is('signed_at', null)
      .order('created_at', { ascending: false })
      .limit(5)

    const stats = {
      users: {
        total: totalUsers,
        by_role: usersByRole,
        new_this_month: newUsersThisMonth
      },
      classes: {
        total: totalClasses || 0,
        enrollments: totalEnrollments || 0
      },
      notes: {
        total: totalNotes || 0,
        this_month: notesThisMonth || 0,
        trend: notesTrend
      },
      revenue: {
        total: totalRevenue,
        payment_count: payments?.length || 0,
        trend: revenueTrend
      },
      inquiries: {
        total: totalInquiries || 0,
        pending: pendingInquiries || 0,
        recent: recentInquiries || []
      },
      waivers: {
        total: totalWaivers || 0,
        signed: signedWaivers || 0,
        pending: (totalWaivers || 0) - (signedWaivers || 0),
        recent: recentWaivers?.map(w => ({
          id: w.id,
          student_name: (w.students as any)?.profile?.full_name || 'Unknown',
          waiver_title: (w.waiver_templates as any)?.title || 'Waiver',
          created_at: w.created_at
        })) || []
      },
      lesson_packs: {
        total_purchased: totalLessonsPurchased,
        total_used: totalLessonsUsed,
        available: totalLessonsPurchased - totalLessonsUsed
      }
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
