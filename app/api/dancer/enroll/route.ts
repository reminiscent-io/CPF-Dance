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
      .select('id, class_type, series_id, is_public, is_cancelled, max_capacity, start_time, enrollments(id)')
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

    // A multi-day workshop is one sign-up: enroll in every upcoming day.
    let days = [classData]
    if (classData.class_type === 'workshop' && classData.series_id) {
      const { data: seriesDays, error: seriesError } = await supabase
        .from('classes')
        .select('id, class_type, series_id, is_public, is_cancelled, max_capacity, start_time, enrollments(id)')
        .eq('series_id', classData.series_id)
        .eq('is_public', true)
        .eq('is_cancelled', false)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (seriesError) {
        console.error('Error fetching workshop days:', seriesError)
        return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 })
      }
      if (seriesDays && seriesDays.length > 0) days = seriesDays
    }

    const { data: existingEnrollments } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('student_id', student.id)
      .in('class_id', days.map(day => day.id))

    const alreadyEnrolled = new Set((existingEnrollments || []).map(row => row.class_id))
    const toEnroll = days.filter(day => !alreadyEnrolled.has(day.id))

    if (toEnroll.length === 0) {
      return NextResponse.json({ error: 'You are already enrolled in this class' }, { status: 400 })
    }

    // Check if class is full (any day of a workshop being full blocks the sign-up)
    const fullDay = toEnroll.find(day => day.max_capacity && (day.enrollments?.length || 0) >= day.max_capacity)
    if (fullDay) {
      return NextResponse.json({
        error: days.length > 1 ? 'One of the workshop days is full' : 'This class is full'
      }, { status: 400 })
    }

    // Create enrollment
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert(toEnroll.map(day => ({
        student_id: student.id,
        class_id: day.id
      })))
      .select()

    if (enrollmentError || !enrollments) {
      console.error('Error creating enrollment:', enrollmentError)
      return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 })
    }

    const enrollment = enrollments.find(row => row.class_id === class_id) ?? enrollments[0]

    return NextResponse.json({ enrollment, enrolled_days: enrollments.length }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
