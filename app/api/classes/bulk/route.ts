import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges, isInstructorOrAdmin } from '@/lib/auth/privileges'

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
    const { classes: classesToCreate } = body

    if (!classesToCreate || !Array.isArray(classesToCreate) || classesToCreate.length === 0) {
      return NextResponse.json({ error: 'No classes provided' }, { status: 400 })
    }

    if (classesToCreate.length > 100) {
      return NextResponse.json({ error: 'Cannot create more than 100 classes at once' }, { status: 400 })
    }

    const createdClasses = []

    for (const classData of classesToCreate) {
      const {
        instructor_id,
        studio_id,
        class_type,
        title,
        description,
        location,
        start_time,
        end_time,
        max_capacity,
        price,
        pricing_model,
        base_cost,
        cost_per_person,
        cost_per_hour,
        tiered_base_students,
        tiered_additional_cost,
        external_signup_url,
        is_public
      } = classData

      let finalInstructorId: string
      if (profile.role === 'admin') {
        if (instructor_id) {
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
          finalInstructorId = profile.id
        }
      } else {
        finalInstructorId = profile.id
      }

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
        pricing_model: pricing_model || 'per_person',
        base_cost: base_cost || null,
        cost_per_person: cost_per_person || null,
        cost_per_hour: cost_per_hour || null,
        tiered_base_students: tiered_base_students || null,
        tiered_additional_cost: tiered_additional_cost || null,
        price: price || null,
        external_signup_url: external_signup_url || null,
        is_public: is_public || false
      }

      const { data: newClass, error } = await supabase
        .from('classes')
        .insert(insertData)
        .select(`
          *,
          studio:studios(name, city, state)
        `)
        .single()

      if (error) {
        console.error('Error creating class:', error)
        return NextResponse.json({ 
          error: `Failed to create class: ${error.message}`,
          created: createdClasses.length 
        }, { status: 500 })
      }

      createdClasses.push({
        ...newClass,
        enrolled_count: 0
      })
    }

    return NextResponse.json({ classes: createdClasses }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
