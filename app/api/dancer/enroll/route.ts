import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const { class_id } = await request.json()

    if (!class_id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // Verify the class exists and is public
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, is_public, is_cancelled, max_capacity, start_time, enrollments(id)')
      .eq('id', class_id)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (!classData.is_public) {
      return NextResponse.json({ error: 'This class is not available for public enrollment' }, { status: 403 })
    }

    if (classData.is_cancelled) {
      return NextResponse.json({ error: 'This class has been cancelled' }, { status: 400 })
    }

    // Check if class is in the past
    if (new Date(classData.start_time) < new Date()) {
      return NextResponse.json({ error: 'Cannot enroll in a past class' }, { status: 400 })
    }

    // Check if class is full
    const enrolledCount = classData.enrollments?.length || 0
    if (classData.max_capacity && enrolledCount >= classData.max_capacity) {
      return NextResponse.json({ error: 'This class is full' }, { status: 400 })
    }

    // Check if student is already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('class_id', class_id)
      .single()

    if (existingEnrollment) {
      return NextResponse.json({ error: 'You are already enrolled in this class' }, { status: 400 })
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert({
        student_id: student.id,
        class_id: class_id
      })
      .select()
      .single()

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError)
      return NextResponse.json({ error: enrollmentError.message }, { status: 500 })
    }

    return NextResponse.json({ enrollment }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
