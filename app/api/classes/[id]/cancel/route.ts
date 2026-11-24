import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findCurrentDancerStudent, getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasDancerPrivileges, hasInstructorPrivileges } from '@/lib/auth/privileges'
import { refundCreditForClass } from '@/lib/lesson-credits'
import { notifyCancellation } from '@/lib/notifications/private-lessons'
import { deleteMeetEvent } from '@/lib/google/calendar'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

type CreditOutcome = 'refunded' | 'forfeited' | 'no_credit'

interface CancelDecision {
  shouldRefund: boolean
  refundReason: string
}

function decideRefund(insideWindow: boolean, isInstructor: boolean, reinstate: boolean, cancelledBy: 'dancer' | 'instructor'): CancelDecision {
  if (insideWindow) {
    if (isInstructor && reinstate) {
      return { shouldRefund: true, refundReason: 'instructor_reinstated_inside_24h' }
    }
    return { shouldRefund: false, refundReason: '' }
  }
  return { shouldRefund: true, refundReason: `cancelled_by_${cancelledBy}_outside_24h` }
}

async function resolveCreditOutcome(
  admin: ReturnType<typeof createAdminClient>,
  classId: string,
  decision: CancelDecision
): Promise<CreditOutcome> {
  if (decision.shouldRefund) {
    const result = await refundCreditForClass({ supabase: admin, classId, reason: decision.refundReason })
    return result.refunded ? 'refunded' : 'no_credit'
  }
  const { data: usage } = await admin
    .from('lesson_pack_usage')
    .select('id')
    .eq('class_id', classId)
    .is('voided_at', null)
    .maybeSingle()
  return usage ? 'forfeited' : 'no_credit'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: classId } = await params
    const admin = createAdminClient()

    const body = await request.json().catch(() => ({}))
    const reason: string | null = typeof body?.reason === 'string' ? body.reason.trim() || null : null
    const reinstateCredit: boolean = body?.reinstate_credit === true

    const { data: classRow, error: classError } = await admin
      .from('classes')
      .select(`
        id, instructor_id, start_time, class_type, is_cancelled, google_calendar_event_id,
        enrollments(id, student_id, students(id, full_name, profile_id, profile:profiles!students_profile_id_fkey(full_name)))
      `)
      .eq('id', classId)
      .single()

    if (classError || !classRow) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (classRow.is_cancelled) {
      return NextResponse.json({ error: 'Class is already cancelled' }, { status: 400 })
    }

    // This route cancels the whole class row, refunds a lesson-pack credit and
    // closes the private-lesson request. That's only right for a private lesson.
    // Group classes and workshop days are cancelled from the class edit dialog.
    if (classRow.class_type !== 'private') {
      return NextResponse.json({ error: 'Only private lessons can be cancelled here' }, { status: 400 })
    }

    const isInstructor = hasInstructorPrivileges(profile)
    let enrolledStudent = classRow.enrollments[0]?.students

    if (isInstructor) {
      if (profile.role !== 'admin' && classRow.instructor_id !== profile.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (!hasDancerPrivileges(profile)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      // The dancer must hold the lesson alone: every enrollment on it is hers.
      const student = await findCurrentDancerStudent()
      const enrollments = classRow.enrollments
      const ownsLesson = !!student && enrollments.length > 0 &&
        enrollments.every(enrollment => enrollment.student_id === student.id)
      if (!ownsLesson) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      enrolledStudent = enrollments[0].students
    }

    const cancelledBy: 'dancer' | 'instructor' = isInstructor ? 'instructor' : 'dancer'
    const insideWindow = new Date(classRow.start_time).getTime() - Date.now() < TWENTY_FOUR_HOURS_MS
    const decision = decideRefund(insideWindow, isInstructor, reinstateCredit, cancelledBy)
    const creditOutcome = await resolveCreditOutcome(admin, classId, decision)

    const { error: updateError } = await admin
      .from('classes')
      .update({ is_cancelled: true, cancellation_reason: reason })
      .eq('id', classId)

    if (updateError) {
      console.error('[classes cancel] update failed:', updateError)
      return NextResponse.json({ error: 'Failed to cancel class' }, { status: 500 })
    }

    await admin
      .from('private_lesson_requests')
      .update({ status: 'cancelled' })
      .eq('scheduled_class_id', classId)

    // Remove the backing Google Calendar event / Meet for virtual lessons (best-effort).
    if (classRow.google_calendar_event_id) {
      try {
        await deleteMeetEvent(classRow.google_calendar_event_id)
      } catch (meetError) {
        console.error('[classes cancel] deleteMeetEvent failed:', meetError)
      }
    }

    try {
      const dancerProfile = Array.isArray(enrolledStudent?.profile) ? enrolledStudent?.profile[0] : enrolledStudent?.profile
      const dancerName = enrolledStudent?.full_name || dancerProfile?.full_name || 'Dancer'
      await notifyCancellation({
        dancerName,
        startTimeIso: classRow.start_time,
        cancelledBy,
        reason,
        creditOutcome
      })
    } catch (notifyError) {
      console.error('[classes cancel] notify failed:', notifyError)
    }

    return NextResponse.json({ success: true, creditOutcome })
  } catch (error) {
    console.error('[classes cancel] unexpected:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
