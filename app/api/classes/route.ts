import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges, isInstructorOrAdmin } from '@/lib/auth/privileges'
import { spendCreditForClass, getDayOfLessonPrice } from '@/lib/lesson-credits'
import { notifyClassScheduled, notifyDancerVirtualLesson } from '@/lib/notifications/private-lessons'
import { createMeetEvent } from '@/lib/google/calendar'

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

    // The "Upcoming" view isn't strictly future: instructors check it the day
    // before a class and want the just-happened sessions for context, while
    // "All" is the full firehose. So upcoming = a couple of recent past classes
    // as lead-in, plus everything still to come.
    const RECENT_PAST_CONTEXT = 2

    const SELECT = `
        *,
        studio:studios(name, city, state),
        instructor:profiles(full_name),
        asset:assets(id, title, file_url, file_type)
      `

    const scoped = () => {
      let q = supabase.from('classes').select(SELECT)
      if (studioId) q = q.eq('studio_id', studioId)
      if (classType) q = q.eq('class_type', classType)
      return q
    }

    let classes: any[] | null = null
    let error: any = null

    if (upcoming === 'true') {
      const now = new Date().toISOString()
      const [future, recentPast] = await Promise.all([
        scoped().gte('start_time', now).order('start_time', { ascending: true }),
        scoped().lt('start_time', now).order('start_time', { ascending: false }).limit(RECENT_PAST_CONTEXT),
      ])
      error = future.error || recentPast.error
      if (!error) {
        // recentPast came back newest-first; flip to chronological so it reads
        // as lead-in above the upcoming run.
        classes = [...(recentPast.data || []).reverse(), ...(future.data || [])]
      }
    } else {
      const result = await scoped().order('start_time', { ascending: true })
      classes = result.data
      error = result.error
    }

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
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
      is_virtual, // Private lessons: create a Google Meet link
      student_id, // For automatically enrolling a student (private lessons)
      asset_id, // Optional promotional asset
      private_lesson_request_id // When created from a request, links + spends credit
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
      is_public: is_public || false,
      // Virtual lesson (Google Meet) — link is populated below after the event is created
      is_virtual: (class_type === 'private' && is_virtual) || false,
      // Asset
      asset_id: asset_id || null
    }

    console.log('Attempting to insert class:', insertData)

    const { data: classData, error } = await supabase
      .from('classes')
      .insert(insertData)
      .select(`
        *,
        studio:studios(name, city, state),
        asset:assets(id, title, file_url, file_type)
      `)
      .single()

    if (error) {
      console.error('Supabase error creating class:', error)
      return NextResponse.json({
        error: 'Failed to create class'
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

    // If linked to a private lesson request, spend a credit, link the class, and notify Courtney.
    // Credit + request-status mutations need the admin client because the instructor's
    // session is RLS-blocked from updating lesson_pack_purchases / private_lesson_requests.
    if (classData && class_type === 'private' && private_lesson_request_id && student_id) {
      const admin = createAdminClient()
      const spendResult = await spendCreditForClass({
        supabase: admin,
        studentId: student_id,
        classId: classData.id,
        requestId: private_lesson_request_id
      })

      await admin
        .from('private_lesson_requests')
        .update({
          status: 'approved',
          scheduled_class_id: classData.id
        })
        .eq('id', private_lesson_request_id)

      try {
        const { data: studentRow } = await admin
          .from('students')
          .select('full_name, profile:profiles!students_profile_id_fkey(full_name)')
          .eq('id', student_id)
          .single()
        const studentProfile = Array.isArray(studentRow?.profile)
          ? studentRow?.profile[0]
          : studentRow?.profile
        const dancerName = studentRow?.full_name || studentProfile?.full_name || 'Dancer'

        const dayOfPrice = spendResult.used ? null : await getDayOfLessonPrice(admin)

        await notifyClassScheduled({
          dancerName,
          startTimeIso: classData.start_time,
          paymentMode: spendResult.used ? 'credit' : 'day_of',
          packName: spendResult.used ? spendResult.packName : null,
          remainingAfter: spendResult.used ? spendResult.remainingAfter : 0,
          dayOfPrice
        })
      } catch (notifyError) {
        console.error('[classes POST] notifyClassScheduled failed:', notifyError)
      }
    }

    // If this is a virtual private lesson, create a Google Meet on Courtney's
    // calendar and notify the enrolled dancer. Best-effort: a Calendar/email
    // failure must NOT fail class creation — the class still exists, just without a link.
    if (classData?.is_virtual && class_type === 'private' && student_id) {
      try {
        const admin = createAdminClient()
        const { data: studentRow } = await admin
          .from('students')
          .select('full_name, email, profile:profiles!students_profile_id_fkey(full_name, email)')
          .eq('id', student_id)
          .single()
        const studentProfile = Array.isArray(studentRow?.profile)
          ? studentRow?.profile[0]
          : studentRow?.profile
        const dancerName = studentRow?.full_name || studentProfile?.full_name || 'Dancer'
        const dancerEmail = studentRow?.email || studentProfile?.email || ''

        const { hangoutLink, eventId } = await createMeetEvent({
          classId: classData.id,
          summary: title,
          description,
          startIso: classData.start_time,
          endIso: classData.end_time,
          attendeeEmails: dancerEmail ? [dancerEmail] : [],
        })

        await admin
          .from('classes')
          .update({ google_meet_url: hangoutLink, google_calendar_event_id: eventId })
          .eq('id', classData.id)

        classData.google_meet_url = hangoutLink
        classData.google_calendar_event_id = eventId

        if (dancerEmail && hangoutLink) {
          await notifyDancerVirtualLesson({
            to: dancerEmail,
            dancerName,
            startTimeIso: classData.start_time,
            meetUrl: hangoutLink,
          })
        }
      } catch (meetError) {
        console.error('[classes POST] Google Meet creation failed:', meetError)
      }
    }

    return NextResponse.json({ class: classData }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
