import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireStudioAdmin } from '@/lib/auth/server-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStudioAdmin()
    const supabase = await createClient()
    const { id } = await params

    // Fetch class details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select(`
        *,
        instructor:profiles!classes_instructor_id_fkey(id, full_name, email, phone),
        studio:studios(name, city, state)
      `)
      .eq('id', id)
      .single()

    if (classError) {
      console.error('Error fetching class:', classError)
      return NextResponse.json({ error: classError.message }, { status: 500 })
    }

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Fetch enrollments with student details
    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        attendance_status,
        enrolled_at,
        student:students!enrollments_student_id_fkey(
          id,
          profile:profiles!students_profile_id_fkey(full_name, email, phone)
        )
      `)
      .eq('class_id', id)
      .order('enrolled_at', { ascending: false })

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
    }

    // Format the data
    const formattedEnrollments = enrollments?.map(enrollment => {
      const student = enrollment.student as any
      const profile = Array.isArray(student?.profile) ? student.profile[0] : student?.profile

      return {
        id: enrollment.id,
        attendance_status: enrollment.attendance_status,
        enrolled_at: enrollment.enrolled_at,
        student: {
          id: student?.id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email,
          phone: profile?.phone
        }
      }
    }) || []

    // Format instructor
    const instructor = Array.isArray(classData.instructor)
      ? classData.instructor[0]
      : classData.instructor

    // Format studio
    const studio = Array.isArray(classData.studio)
      ? classData.studio[0]
      : classData.studio

    const formattedClass = {
      ...classData,
      instructor: instructor || null,
      studio: studio || null,
      enrollments: formattedEnrollments
    }

    return NextResponse.json({ class: formattedClass })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
