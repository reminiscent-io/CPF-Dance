import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    await requireRole('admin')
    const supabase = await createClient()

    // Get all instructor signup requests (profiles with instructor role)
    // In the future, you might have a separate instructor_requests table
    // For now, we'll get all instructor profiles and show their details
    const { data: instructors, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        phone,
        created_at,
        bio,
        specialties
      `)
      .eq('role', 'instructor')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get student count for each instructor
    const instructorIds = instructors?.map(i => i.id) || []
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('instructor_id')
      .in('instructor_id', instructorIds)

    const studentCounts = students?.reduce((acc, student) => {
      if (student.instructor_id) {
        acc[student.instructor_id] = (acc[student.instructor_id] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>) || {}

    // Get class count for each instructor
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('instructor_id')
      .in('instructor_id', instructorIds)

    const classCounts = classes?.reduce((acc, classItem) => {
      if (classItem.instructor_id) {
        acc[classItem.instructor_id] = (acc[classItem.instructor_id] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>) || {}

    const instructorsWithStats = instructors?.map(instructor => ({
      ...instructor,
      student_count: studentCounts[instructor.id] || 0,
      class_count: classCounts[instructor.id] || 0
    })) || []

    return NextResponse.json({ instructors: instructorsWithStats })
  } catch (error) {
    console.error('Error fetching instructor requests:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
