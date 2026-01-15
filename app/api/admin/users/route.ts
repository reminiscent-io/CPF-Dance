import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at
      `)
      .order('created_at', { ascending: false })
    
    if (profilesError) {
      console.error('[Admin Users] Error fetching profiles:', profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        lesson_pack_purchases (
          id,
          remaining_lessons,
          lesson_packs (
            lesson_count
          )
        )
      `)
    
    if (studentsError) {
      console.error('[Admin Users] Error fetching students:', studentsError)
    }

    const studentMap = new Map()
    studentsData?.forEach(student => {
      studentMap.set(student.profile_id, student)
    })

    console.log('[Admin Users] Fetched profiles count:', profiles?.length || 0)

    const usersWithLessonData = profiles?.map(profile => {
      const student = studentMap.get(profile.id)
      const lessonPacks = student?.lesson_pack_purchases || []

      let totalPurchased = 0
      let totalRemaining = 0

      lessonPacks.forEach((pack: any) => {
        const lessonCount = pack.lesson_packs?.lesson_count || 0
        totalPurchased += lessonCount
        totalRemaining += pack.remaining_lessons || 0
      })

      const totalUsed = totalPurchased - totalRemaining

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at,
        student_id: student?.id || null,
        lessons_purchased: totalPurchased,
        lessons_used: totalUsed,
        lessons_available: totalRemaining,
        lesson_pack_count: lessonPacks.length
      }
    }) || []

    return NextResponse.json({ users: usersWithLessonData })
  } catch (error: any) {
    console.error('[Admin Users] Error:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
