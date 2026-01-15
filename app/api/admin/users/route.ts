import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    // Get all profiles first
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

    // Get students with lesson pack purchases separately
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        profile_id,
        lesson_pack_purchases (
          id,
          lessons_purchased,
          lessons_used,
          created_at
        )
      `)
    
    if (studentsError) {
      console.error('[Admin Users] Error fetching students:', studentsError)
    }

    // Create a map of profile_id to student data
    const studentMap = new Map()
    studentsData?.forEach(student => {
      studentMap.set(student.profile_id, student)
    })

    console.log('[Admin Users] Fetched profiles count:', profiles?.length || 0)

    // Transform data to include lesson pack summary
    const usersWithLessonData = profiles?.map(profile => {
      const student = studentMap.get(profile.id)
      const lessonPacks = student?.lesson_pack_purchases || []

      const totalPurchased = lessonPacks.reduce((sum: number, pack: any) => sum + pack.lessons_purchased, 0)
      const totalUsed = lessonPacks.reduce((sum: number, pack: any) => sum + pack.lessons_used, 0)
      const available = totalPurchased - totalUsed

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at,
        student_id: student?.id || null,
        lessons_purchased: totalPurchased,
        lessons_used: totalUsed,
        lessons_available: available,
        lesson_pack_count: lessonPacks.length
      }
    }) || []

    return NextResponse.json({ users: usersWithLessonData })
  } catch (error: any) {
    console.error('[Admin Users] Error:', error?.message || error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
