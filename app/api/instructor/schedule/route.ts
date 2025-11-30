import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireInstructor()
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('classes')
      .select(`
        id,
        title,
        description,
        location,
        start_time,
        end_time,
        class_type,
        max_capacity,
        is_cancelled,
        cancellation_reason,
        studio_id,
        instructor_id,
        studios (
          name,
          address
        )
      `)
      .order('start_time', { ascending: true })

    // Non-admin instructors can only see their own classes
    if (profile.role !== 'admin') {
      query = query.eq('instructor_id', profile.id)
    }

    // Filter by date range if provided
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    if (endDate) {
      query = query.lte('start_time', endDate)
    }

    const { data: classes, error: classesError } = await query

    if (classesError) {
      return NextResponse.json({ error: classesError.message }, { status: 500 })
    }

    // Get enrollment counts for each class
    const classIds = classes?.map(c => c.id) || []

    let enrollmentCounts: Record<string, number> = {}
    if (classIds.length > 0) {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)

      if (!enrollmentsError && enrollments) {
        enrollmentCounts = enrollments.reduce((acc, enrollment) => {
          acc[enrollment.class_id] = (acc[enrollment.class_id] || 0) + 1
          return acc
        }, {} as Record<string, number>)
      }
    }

    // Add enrollment count to each class
    const classesWithEnrollments = classes?.map(classItem => ({
      ...classItem,
      enrolled_count: enrollmentCounts[classItem.id] || 0
    }))

    return NextResponse.json({ data: classesWithEnrollments })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
