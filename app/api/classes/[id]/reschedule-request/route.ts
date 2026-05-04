import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'
import { notifyRescheduleRequested } from '@/lib/notifications/private-lessons'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    const { id: classId } = await params

    const body = await request.json().catch(() => ({}))
    const proposedDates: string[] = Array.isArray(body?.proposed_dates)
      ? body.proposed_dates.filter((d: unknown): d is string => typeof d === 'string' && d.trim().length > 0)
      : []
    const reason: string | null = typeof body?.reason === 'string' ? body.reason.trim() || null : null

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('class_id', classId)
      .eq('student_id', student.id)
      .maybeSingle()

    if (enrollmentError || !enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this class' }, { status: 403 })
    }

    const { data: classRow, error: classError } = await supabase
      .from('classes')
      .select('id, start_time, is_cancelled')
      .eq('id', classId)
      .single()

    if (classError || !classRow) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (classRow.is_cancelled) {
      return NextResponse.json({ error: 'Class is cancelled' }, { status: 400 })
    }

    const { data: created, error: insertError } = await supabase
      .from('lesson_reschedule_requests')
      .insert({
        class_id: classId,
        student_id: student.id,
        proposed_dates: proposedDates,
        reason
      })
      .select()
      .single()

    if (insertError) {
      console.error('[reschedule-request] insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
    }

    try {
      const { data: studentRow } = await supabase
        .from('students')
        .select('full_name, profile:profiles!students_profile_id_fkey(full_name)')
        .eq('id', student.id)
        .single()
      const studentProfile = Array.isArray(studentRow?.profile)
        ? studentRow?.profile[0]
        : studentRow?.profile
      const dancerName = studentRow?.full_name || studentProfile?.full_name || 'Dancer'

      await notifyRescheduleRequested({
        dancerName,
        startTimeIso: classRow.start_time,
        proposedDates,
        reason
      })
    } catch (notifyError) {
      console.error('[reschedule-request] notify failed:', notifyError)
    }

    return NextResponse.json({ rescheduleRequest: created }, { status: 201 })
  } catch (error) {
    console.error('[reschedule-request] unexpected:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
