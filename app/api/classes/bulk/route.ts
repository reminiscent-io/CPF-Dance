import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges, isInstructorOrAdmin } from '@/lib/auth/privileges'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  attachMeetToPrivateLesson,
  getPrivateLessonDancer,
  type PrivateLessonDancer
} from '@/lib/google/private-lesson-meet'

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
    // link_series: give the whole batch one series_id (a multi-day workshop).
    // link_to_class_id: join an existing class's series (adding days to it).
    const { classes: classesToCreate, link_series, link_to_class_id } = body

    if (!classesToCreate || !Array.isArray(classesToCreate) || classesToCreate.length === 0) {
      return NextResponse.json({ error: 'No classes provided' }, { status: 400 })
    }

    if (classesToCreate.length > 100) {
      return NextResponse.json({ error: 'Cannot create more than 100 classes at once' }, { status: 400 })
    }

    let seriesId: string | null = null
    if (link_to_class_id) {
      const { data: source } = await supabase
        .from('classes')
        .select('id, series_id, instructor_id')
        .eq('id', link_to_class_id)
        .single()

      if (!source || (profile.role !== 'admin' && source.instructor_id !== profile.id)) {
        return NextResponse.json({ error: 'Class to add days to was not found' }, { status: 404 })
      }

      seriesId = source.series_id
      if (!seriesId) {
        seriesId = crypto.randomUUID()
        const { error: linkError } = await supabase
          .from('classes')
          .update({ series_id: seriesId })
          .eq('id', source.id)
        if (linkError) {
          console.error('Error linking source class to series:', linkError)
          return NextResponse.json({ error: 'Failed to link classes' }, { status: 500 })
        }
      }
    } else if (link_series) {
      seriesId = crypto.randomUUID()
    }

    const createdClasses = []
    // Virtual private series: one dancer lookup, one Meet per lesson. The dancer
    // gets a Google Calendar invite per lesson but no per-lesson email — a
    // 12-week series shouldn't mean 12 extra emails.
    let admin: ReturnType<typeof createAdminClient> | null = null
    const dancerCache = new Map<string, PrivateLessonDancer>()
    let meetsCreated = 0
    let meetsFailed = 0
    let dancerHasEmail = true

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
        is_public,
        is_virtual, // Private lessons: create a Google Meet link per lesson
        student_id, // Private lessons: enroll this student in every lesson
        asset_id,
        workshop_price,
        workshop_signup_url,
        workshop_full_only
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
        is_public: is_public || false,
        is_virtual: (class_type === 'private' && is_virtual) || false,
        asset_id: asset_id || null,
        series_id: seriesId,
        // Full-run pricing only means something on linked workshop days
        workshop_price: seriesId && class_type === 'workshop' ? workshop_price ?? null : null,
        workshop_signup_url: seriesId && class_type === 'workshop' ? workshop_signup_url || null : null,
        workshop_full_only: Boolean(seriesId && class_type === 'workshop' && workshop_full_only)
      }

      const { data: newClass, error } = await supabase
        .from('classes')
        .insert(insertData)
        .select(`
          *,
          studio:studios(name, city, state),
          asset:assets(id, title, file_url, file_type)
        `)
        .single()

      if (error) {
        console.error('Error creating class:', error)
        return NextResponse.json({ 
          error: 'Failed to create class',
          created: createdClasses.length 
        }, { status: 500 })
      }

      let enrolled = false
      if (student_id) {
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            student_id,
            class_id: newClass.id,
            enrolled_at: new Date().toISOString()
          })
        if (enrollError) {
          // Don't fail the batch - the class exists, the instructor can enroll manually
          console.error('Error auto-enrolling student:', enrollError)
        } else {
          enrolled = true
        }
      }

      // Best-effort, same as single create: a Calendar failure leaves the lesson without a link
      if (newClass.is_virtual && class_type === 'private' && student_id) {
        try {
          admin ??= createAdminClient()
          let dancer = dancerCache.get(student_id)
          if (!dancer) {
            dancer = await getPrivateLessonDancer(admin, student_id)
            dancerCache.set(student_id, dancer)
          }
          const meet = await attachMeetToPrivateLesson({
            admin,
            classData: newClass,
            title,
            description,
            dancer,
            emailDancer: false
          })
          meetsCreated++
          if (!meet.dancerHasEmail) dancerHasEmail = false
        } catch (meetError) {
          meetsFailed++
          console.error('[classes/bulk POST] Google Meet creation failed:', meetError)
        }
      }

      createdClasses.push({
        ...newClass,
        enrolled_count: enrolled ? 1 : 0
      })
    }

    const meet = meetsCreated + meetsFailed > 0
      ? { created: meetsCreated, failed: meetsFailed, dancerHasEmail }
      : null

    return NextResponse.json({ classes: createdClasses, meet }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
