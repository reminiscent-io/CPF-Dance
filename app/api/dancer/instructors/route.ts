import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    // Get all instructors this student is connected to through instructor_student_relationships
    const { data: relationships, error: relationshipsError } = await supabase
      .from('instructor_student_relationships')
      .select('instructor_id')
      .eq('student_id', student.id)

    if (relationshipsError) {
      return NextResponse.json({ error: relationshipsError.message }, { status: 500 })
    }

    const instructorIds = relationships?.map(r => r.instructor_id) || []

    // Get instructors from relationships and all admin/instructor profiles
    const { data: instructors, error: instructorsError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`and(id.in.(${instructorIds.length > 0 ? instructorIds.join(',') : 'null'}),role.eq.instructor),role.eq.admin,and(full_name.ilike.%Courtney%,role.eq.instructor)`)
      .order('full_name', { ascending: true })

    if (instructorsError) {
      return NextResponse.json({ error: instructorsError.message }, { status: 500 })
    }

    // Deduplicate and filter instructors and admins
    const uniqueInstructors = Array.from(
      new Map(
        (instructors || []).map((inst) => [inst.id, inst])
      ).values()
    )

    return NextResponse.json({ instructors: uniqueInstructors })
  } catch (error) {
    console.error('Error fetching instructors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
