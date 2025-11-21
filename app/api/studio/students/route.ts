import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudioAdmin } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireStudioAdmin()
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('students')
      .select(`
        id,
        age_group,
        skill_level,
        is_active,
        profile:profiles!students_profile_id_fkey(full_name, email, phone),
        enrollments(count)
      `)
      .order('created_at', { ascending: false })

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: students, error } = await query

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const formattedStudents = students.map(student => {
      // Handle profile - it might be an array, null, or object
      let profile = student.profile
      if (Array.isArray(profile)) {
        profile = profile[0] || null
      }

      return {
        id: student.id,
        age_group: student.age_group,
        skill_level: student.skill_level,
        is_active: student.is_active,
        profile: profile || { full_name: 'Unknown', email: null, phone: null },
        total_classes: Array.isArray(student.enrollments) ? student.enrollments.length : 0
      }
    })

    return NextResponse.json({ students: formattedStudents })
  } catch (error) {
    console.error('Error in studio students API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
