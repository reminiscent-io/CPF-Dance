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

    if (instructorIds.length === 0) {
      return NextResponse.json({ instructors: [] })
    }

    // Get the instructor profiles
    const { data: instructors, error: instructorsError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', instructorIds)
      .eq('role', 'instructor')
      .order('full_name', { ascending: true })

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
