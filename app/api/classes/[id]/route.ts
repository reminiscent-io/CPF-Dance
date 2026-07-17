import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges, isInstructorOrAdmin } from '@/lib/auth/privileges'
import { refundCreditForClass } from '@/lib/lesson-credits'
import { createMeetEvent, updateMeetEventTime, deleteMeetEvent } from '@/lib/google/calendar'
import { notifyDancerVirtualLesson } from '@/lib/notifications/private-lessons'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { id } = await params

    const { data: classData, error } = await supabase
      .from('classes')
      .select(`
        *,
        studio:studios(name, city, state),
        enrollments(id, student_id),
        asset:assets(id, title, file_url, file_type)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching class:', error)
      return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 })
    }

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    return NextResponse.json({ class: classData })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Keep the backing Google Calendar event / Meet link in sync after a private lesson
// is edited. Best-effort: a Calendar failure logs but never fails the class update.
async function syncVirtualLessonCalendar(
  classData: any
): Promise<{ url: string; dancerHasEmail: boolean; dancerNotified: boolean } | null> {
  // Set only when a new Meet link is created (toggled virtual on), so the client
  // can warn when the dancer has no email and therefore was not auto-notified.
  let meet: { url: string; dancerHasEmail: boolean; dancerNotified: boolean } | null = null
  try {
    const admin = createAdminClient()
    const eventId: string | null = classData.google_calendar_event_id

    if (classData.is_virtual && classData.class_type === 'private') {
      if (eventId) {
        // Rescheduled — push the new time to the existing event.
        await updateMeetEventTime({
          eventId,
          startIso: classData.start_time,
          endIso: classData.end_time,
        })
      } else {
        // Toggled virtual on — create a Meet and notify the enrolled dancer.
        const { data: enrollment } = await admin
          .from('enrollments')
          .select('students(full_name, email, profile:profiles!students_profile_id_fkey(full_name, email))')
          .eq('class_id', classData.id)
          .limit(1)
        const enr = Array.isArray(enrollment) ? enrollment[0] : enrollment
        const student = Array.isArray(enr?.students) ? enr?.students[0] : enr?.students
        const studentProfile = Array.isArray(student?.profile) ? student?.profile[0] : student?.profile
        const dancerName = student?.full_name || studentProfile?.full_name || 'Dancer'
        const dancerEmail = student?.email || studentProfile?.email || ''

        const { hangoutLink, eventId: newEventId } = await createMeetEvent({
          classId: classData.id,
          summary: classData.title,
          description: classData.description,
          startIso: classData.start_time,
          endIso: classData.end_time,
          attendeeEmails: dancerEmail ? [dancerEmail] : [],
        })
        await admin
          .from('classes')
          .update({ google_meet_url: hangoutLink, google_calendar_event_id: newEventId })
          .eq('id', classData.id)
        classData.google_meet_url = hangoutLink
        classData.google_calendar_event_id = newEventId

        meet = {
          url: hangoutLink,
          dancerHasEmail: Boolean(dancerEmail),
          dancerNotified: Boolean(dancerEmail && hangoutLink),
        }

        if (dancerEmail && hangoutLink) {
          await notifyDancerVirtualLesson({
            to: dancerEmail,
            dancerName,
            startTimeIso: classData.start_time,
            meetUrl: hangoutLink,
          })
        }
      }
    } else if (eventId) {
      // Toggled virtual off (or no longer private) — remove the event and clear the link.
      await deleteMeetEvent(eventId)
      await admin
        .from('classes')
        .update({ google_meet_url: null, google_calendar_event_id: null })
        .eq('id', classData.id)
      classData.google_meet_url = null
      classData.google_calendar_event_id = null
    }
  } catch (error) {
    console.error('[classes PATCH] virtual lesson calendar sync failed:', error)
  }
  return meet
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can update classes' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

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
      price, // Legacy field
      pricing_model,
      base_cost,
      cost_per_person,
      cost_per_hour,
      tiered_base_students,
      tiered_additional_cost,
      is_cancelled,
      cancellation_reason,
      actual_attendance_count,
      external_signup_url,
      is_public,
      is_virtual,
      asset_id // Optional promotional asset
    } = body

    // Convert datetime-local format to ISO 8601 if needed
    let startTimeISO = start_time
    let endTimeISO = end_time

    if (start_time && start_time.includes('T') && !start_time.includes('Z')) {
      startTimeISO = new Date(start_time).toISOString()
    }

    if (end_time && end_time.includes('T') && !end_time.includes('Z')) {
      endTimeISO = new Date(end_time).toISOString()
    }

    const updateData: any = {}

    // Only admins can change the instructor
    if (instructor_id !== undefined && profile.role === 'admin') {
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

        updateData.instructor_id = instructor_id
      }
    }

    if (studio_id !== undefined) updateData.studio_id = studio_id || null
    if (class_type !== undefined) updateData.class_type = class_type
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (location !== undefined) updateData.location = location || null
    if (start_time !== undefined) updateData.start_time = startTimeISO
    if (end_time !== undefined) updateData.end_time = endTimeISO
    if (max_capacity !== undefined) updateData.max_capacity = max_capacity || null
    if (price !== undefined) updateData.price = price || null
    // Pricing fields
    if (pricing_model !== undefined) updateData.pricing_model = pricing_model
    if (base_cost !== undefined) updateData.base_cost = base_cost || null
    if (cost_per_person !== undefined) updateData.cost_per_person = cost_per_person || null
    if (cost_per_hour !== undefined) updateData.cost_per_hour = cost_per_hour || null
    if (tiered_base_students !== undefined) updateData.tiered_base_students = tiered_base_students || null
    if (tiered_additional_cost !== undefined) updateData.tiered_additional_cost = tiered_additional_cost || null
    if (is_cancelled !== undefined) updateData.is_cancelled = is_cancelled
    if (cancellation_reason !== undefined) updateData.cancellation_reason = cancellation_reason || null
    if (actual_attendance_count !== undefined) updateData.actual_attendance_count = actual_attendance_count || null
    // Public features
    if (external_signup_url !== undefined) updateData.external_signup_url = external_signup_url || null
    if (is_public !== undefined) updateData.is_public = is_public
    // Virtual lesson flag (Meet link sync handled after the update below)
    if (is_virtual !== undefined) updateData.is_virtual = is_virtual || false
    // Asset
    if (asset_id !== undefined) updateData.asset_id = asset_id || null

    // Build query - admins can update any class, instructors only their own
    let query = supabase
      .from('classes')
      .update(updateData)
      .eq('id', id)

    // Non-admin instructors can only update their own classes
    if (profile.role !== 'admin') {
      query = query.eq('instructor_id', profile.id)
    }

    const { data: classData, error } = await query
      .select(`
        *,
        studio:studios(name, city, state),
        asset:assets(id, title, file_url, file_type)
      `)
      .single()

    if (error) {
      console.error('Supabase error updating class:', error)
      return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
    }

    if (!classData) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 })
    }

    const meet = await syncVirtualLessonCalendar(classData)

    return NextResponse.json({ class: classData, meet })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can delete classes' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = await params

    // Refund any active credit attached to this class before deletion.
    // Uses the admin client because nobody has UPDATE on lesson_pack_usage under RLS.
    await refundCreditForClass({ supabase: createAdminClient(), classId: id, reason: 'class_deleted' })

    // Remove the backing Google Calendar event / Meet for virtual lessons (best-effort).
    try {
      const { data: classRow } = await createAdminClient()
        .from('classes')
        .select('google_calendar_event_id')
        .eq('id', id)
        .single()
      if (classRow?.google_calendar_event_id) {
        await deleteMeetEvent(classRow.google_calendar_event_id)
      }
    } catch (meetError) {
      console.error('[classes DELETE] deleteMeetEvent failed:', meetError)
    }

    // Build query - admins can delete any class, instructors only their own
    let query = supabase
      .from('classes')
      .delete()
      .eq('id', id)

    // Non-admin instructors can only delete their own classes
    if (profile.role !== 'admin') {
      query = query.eq('instructor_id', profile.id)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting class:', error)
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
