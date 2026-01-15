import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    // Get all profiles with their student records and lesson pack purchases
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        students (
          id,
          lesson_pack_purchases (
            id,
            lessons_purchased,
            lessons_used,
            created_at
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // Transform data to include lesson pack summary
    const usersWithLessonData = profiles?.map(profile => {
      const student = profile.students?.[0]
      const lessonPacks = student?.lesson_pack_purchases || []

      const totalPurchased = lessonPacks.reduce((sum, pack) => sum + pack.lessons_purchased, 0)
      const totalUsed = lessonPacks.reduce((sum, pack) => sum + pack.lessons_used, 0)
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
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
