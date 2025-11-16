import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        attendance_status,
        notes,
        class_id,
        classes (
          id,
          title,
          description,
          location,
          start_time,
          end_time,
          class_type,
          is_cancelled,
          instructor_id,
          studio_id,
          studios (
            id,
            name,
            address,
            city,
            state
          )
        )
      `)
      .eq('student_id', student.id)
      .order('classes(start_time)', { ascending: true })

    if (enrollmentsError) {
      return NextResponse.json({ error: enrollmentsError.message }, { status: 500 })
    }

    const { data: instructorProfiles, error: instructorError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'instructor')

    const instructorMap = new Map(
      instructorProfiles?.map(p => [p.id, p.full_name]) || []
    )

    const classes = enrollments?.map(enrollment => {
      const classData = enrollment.classes as any
      return {
        ...classData,
        enrollment_id: enrollment.id,
        enrolled_at: enrollment.enrolled_at,
        attendance_status: enrollment.attendance_status,
        enrollment_notes: enrollment.notes,
        instructor_name: instructorMap.get(classData.instructor_id) || 'Unknown',
        studio: classData.studios
      }
    }) || []

    return NextResponse.json({ classes })
  } catch (error) {
    console.error('Error fetching dancer classes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
