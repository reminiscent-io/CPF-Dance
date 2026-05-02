import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'

export async function GET(_request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

    const [
      profilesRes,
      classesRes,
      totalNotesRes,
      notesThisMonthRes,
      enrollmentsRes,
      paymentsRes,
      totalInquiriesRes,
      pendingInquiriesRes,
      totalWaiversRes,
      signedWaiversRes,
      lessonPacksRes,
      notesTrendRes,
      revenueTrendRes,
      recentInquiriesRes,
      recentWaiversRes,
    ] = await Promise.all([
      supabase.from('profiles').select('role, created_at'),
      supabase.from('classes').select('*', { count: 'exact', head: true }),
      supabase.from('notes').select('*', { count: 'exact', head: true }),
      supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstOfMonth),
      supabase.from('enrollments').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('amount, status'),
      supabase.from('studio_inquiries').select('*', { count: 'exact', head: true }),
      supabase
        .from('studio_inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),
      supabase.from('waivers').select('*', { count: 'exact', head: true }),
      supabase
        .from('waivers')
        .select('*', { count: 'exact', head: true })
        .not('signed_at', 'is', null),
      supabase.from('lesson_pack_purchases').select('lessons_purchased, lessons_used'),
      supabase.from('notes').select('created_at').gte('created_at', thirtyDaysAgoIso),
      supabase
        .from('payments')
        .select('transaction_date, amount')
        .eq('payment_status', 'paid')
        .gte('transaction_date', thirtyDaysAgoIso),
      supabase
        .from('studio_inquiries')
        .select('id, studio_name, contact_name, contact_email, created_at, status')
        .eq('status', 'new')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
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
        .limit(5),
    ])

    if (profilesRes.error) {
      console.error('Error fetching profiles for stats:', profilesRes.error)
      return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
    }

    const profiles = profilesRes.data ?? []
    const usersByRole = profiles.reduce((acc, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    const firstOfMonthDate = new Date(firstOfMonth)
    const newUsersThisMonth = profiles.filter(
      (p) => new Date(p.created_at) >= firstOfMonthDate
    ).length

    const payments = paymentsRes.data ?? []
    const totalRevenue = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const lessonPacks = lessonPacksRes.data ?? []
    const totalLessonsPurchased = lessonPacks.reduce(
      (sum, pack) => sum + pack.lessons_purchased,
      0
    )
    const totalLessonsUsed = lessonPacks.reduce(
      (sum, pack) => sum + pack.lessons_used,
      0
    )

    const dayKeys: string[] = []
    const noteCounts = new Map<string, number>()
    const revenueAmounts = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const key = date.toISOString().slice(0, 10)
      dayKeys.push(key)
      noteCounts.set(key, 0)
      revenueAmounts.set(key, 0)
    }
    for (const row of notesTrendRes.data ?? []) {
      const key = row.created_at.slice(0, 10)
      if (noteCounts.has(key)) noteCounts.set(key, (noteCounts.get(key) || 0) + 1)
    }
    for (const row of revenueTrendRes.data ?? []) {
      const key = row.transaction_date.slice(0, 10)
      if (revenueAmounts.has(key)) {
        revenueAmounts.set(key, (revenueAmounts.get(key) || 0) + (row.amount || 0))
      }
    }
    const notesTrend = dayKeys.map((date) => ({ date, count: noteCounts.get(date) || 0 }))
    const revenueTrend = dayKeys.map((date) => ({
      date,
      amount: revenueAmounts.get(date) || 0,
    }))

    const totalWaivers = totalWaiversRes.count || 0
    const signedWaivers = signedWaiversRes.count || 0

    const stats = {
      users: {
        total: profiles.length,
        by_role: usersByRole,
        new_this_month: newUsersThisMonth,
      },
      classes: {
        total: classesRes.count || 0,
        enrollments: enrollmentsRes.count || 0,
      },
      notes: {
        total: totalNotesRes.count || 0,
        this_month: notesThisMonthRes.count || 0,
        trend: notesTrend,
      },
      revenue: {
        total: totalRevenue,
        payment_count: payments.length,
        trend: revenueTrend,
      },
      inquiries: {
        total: totalInquiriesRes.count || 0,
        pending: pendingInquiriesRes.count || 0,
        recent:
          recentInquiriesRes.data?.map((inq) => ({
            id: inq.id,
            name: inq.studio_name,
            email: inq.contact_email,
            created_at: inq.created_at,
          })) || [],
      },
      waivers: {
        total: totalWaivers,
        signed: signedWaivers,
        pending: totalWaivers - signedWaivers,
        recent:
          recentWaiversRes.data?.map((w) => ({
            id: w.id,
            student_name:
              (w.students as { profile?: { full_name?: string } } | null)?.profile?.full_name ||
              'Unknown',
            waiver_title:
              (w.waiver_templates as { title?: string } | null)?.title || 'Waiver',
            created_at: w.created_at,
          })) || [],
      },
      lesson_packs: {
        total_purchased: totalLessonsPurchased,
        total_used: totalLessonsUsed,
        available: totalLessonsPurchased - totalLessonsUsed,
      },
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
