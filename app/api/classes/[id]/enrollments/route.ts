import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    const supabase = await createClient()
    const { id: classId } = await params
    const body = await request.json()
    const { student_id } = body

    if (!student_id) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', student_id)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Student already enrolled' }, { status: 400 })
    }

    const { error } = await supabase
      .from('enrollments')
      .insert({
        class_id: classId,
        student_id,
        enrolled_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error enrolling student:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    const supabase = await createClient()
    const { id } = await params

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        students (
          id,
          full_name,
          email,
          profile:profiles!students_profile_id_fkey(full_name, email)
        )
      `)
      .eq('class_id', id)

    if (error) {
      console.error('Error fetching enrollments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform the data to flatten the students object
    // Use profile name as priority (for portal users), fallback to student's direct name (for manually added students)
    const transformedEnrollments = (enrollments || []).map((enrollment: any) => {
      const student = enrollment.students
      // Handle profile which may be an array or single object due to Supabase join behavior
      const profile = Array.isArray(student?.profile) ? student.profile[0] : student?.profile
      return {
        id: student?.id || '',
        full_name: profile?.full_name || student?.full_name || 'Unknown',
        email: profile?.email || student?.email || ''
      }
    })

    return NextResponse.json({ enrollments: transformedEnrollments })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
