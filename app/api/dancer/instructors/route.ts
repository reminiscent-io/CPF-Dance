import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    // Get instructors this dancer has a relationship with
    const { data: relationships, error: relError } = await supabase
      .from('instructor_student_relationships')
      .select('instructor_id')
      .eq('student_id', student.id)

    if (relError) {
      return NextResponse.json({ error: relError.message }, { status: 500 })
    }

    const instructorIds = (relationships || []).map(r => r.instructor_id)

    if (instructorIds.length === 0) {
      // Fallback: return all instructors if no relationships exist
      const { data: allInstructors, error: allError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'instructor')

      if (allError) {
        return NextResponse.json({ error: allError.message }, { status: 500 })
      }

      return NextResponse.json({ instructors: allInstructors || [] })
    }

    const { data: instructors, error: instructorsError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', instructorIds)
      .eq('role', 'instructor')

    if (instructorsError) {
      return NextResponse.json({ error: instructorsError.message }, { status: 500 })
    }

    return NextResponse.json({ instructors: instructors || [] })
  } catch (error) {
    console.error('Error fetching instructors:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
