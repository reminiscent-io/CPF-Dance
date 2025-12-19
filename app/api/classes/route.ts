import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges, isInstructorOrAdmin } from '@/lib/auth/privileges'

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()
    
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const studioId = searchParams.get('studio_id')
    const classType = searchParams.get('class_type')
    const upcoming = searchParams.get('upcoming')

    let query = supabase
      .from('classes')
      .select(`
        *,
        studio:studios(name, city, state),
        instructor:profiles(full_name)
      `)
      .order('start_time', { ascending: true })

    if (studioId) {
      query = query.eq('studio_id', studioId)
    }

    if (classType) {
      query = query.eq('class_type', classType)
    }

    if (upcoming === 'true') {
      const now = new Date().toISOString()
      query = query.gte('start_time', now)
    }

    const { data: classes, error } = await query

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const classesWithCount = (classes || []).map(cls => ({
      ...cls,
      enrolled_count: 0,
      instructor_name: cls.instructor?.full_name || 'Unknown'
    }))

    return NextResponse.json({ classes: classesWithCount })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can create classes' }, { status: 403 })
    }

    const supabase = await createClient()

    const body = await request.json()

    const {
      instructor_id, // Admins can specify this, instructors cannot
      studio_id,
      class_type,
      title,
      description,
      location,
      start_time,
      end_time,
      max_capacity,
      price, // Legacy field
      pricing_model,
      base_cost,
      cost_per_person,
      cost_per_hour,
      tiered_base_students,
      tiered_additional_cost,
      external_signup_url,
      is_public,
      student_id // For automatically enrolling a student (private lessons)
    } = body

    // Determine instructor_id based on role
    let finalInstructorId: string
    if (profile.role === 'admin') {
      // Admins can create classes for themselves or specify another instructor/admin
      if (instructor_id) {
        // Validate that the specified user exists and is an instructor or admin
        const { data: instructorProfile, error: instructorError } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', instructor_id)
          .single()

        if (instructorError || !instructorProfile) {
          return NextResponse.json({
            error: 'Invalid instructor_id: User not found'
          }, { status: 400 })
        }

        if (!isInstructorOrAdmin(instructorProfile.role)) {
          return NextResponse.json({
            error: 'Invalid instructor_id: User must be an instructor or admin'
          }, { status: 400 })
        }

        finalInstructorId = instructor_id
      } else {
        // If no instructor_id specified, use the admin's own ID
        finalInstructorId = profile.id
      }
    } else {
      // Instructors can only create classes for themselves
      finalInstructorId = profile.id
    }

    // Convert datetime-local format to ISO 8601 if needed
    const startTimeISO = start_time.includes('T') && !start_time.includes('Z')
      ? new Date(start_time).toISOString()
      : start_time

    const endTimeISO = end_time.includes('T') && !end_time.includes('Z')
      ? new Date(end_time).toISOString()
      : end_time

    const insertData = {
      instructor_id: finalInstructorId,
      studio_id: studio_id || null,
      class_type,
      title,
      description: description || null,
      location: location || null,
      start_time: startTimeISO,
      end_time: endTimeISO,
      max_capacity: max_capacity || null,
      // Pricing fields
      pricing_model: pricing_model || 'per_person',
      base_cost: base_cost || null,
      cost_per_person: cost_per_person || null,
      cost_per_hour: cost_per_hour || null,
      tiered_base_students: tiered_base_students || null,
      tiered_additional_cost: tiered_additional_cost || null,
      price: price || null, // Legacy field for backwards compatibility
      // Public features
      external_signup_url: external_signup_url || null,
      is_public: is_public || false
    }

    console.log('Attempting to insert class:', insertData)

    const { data: classData, error } = await supabase
      .from('classes')
      .insert(insertData)
      .select(`
        *,
        studio:studios(name, city, state)
      `)
      .single()

    if (error) {
      console.error('Supabase error creating class:', error)
      return NextResponse.json({
        error: error.message,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    // If a student_id was provided (for private lessons), automatically enroll them
    if (student_id && classData) {
      try {
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            student_id,
            class_id: classData.id,
            enrolled_at: new Date().toISOString()
          })

        if (enrollError) {
          console.error('Error auto-enrolling student:', enrollError)
          // Don't fail the entire request - class was created successfully
          // Just log the error
        }
      } catch (enrollError) {
        console.error('Unexpected error during enrollment:', enrollError)
      }
    }

    return NextResponse.json({ class: classData }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
