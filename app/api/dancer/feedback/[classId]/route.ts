import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findCurrentDancerStudent, getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { parseFeedback } from '@/lib/class-feedback'
import { feedbackHeading, loadFeedbackSubject, type FeedbackSubject } from '@/lib/class-feedback-server'

/**
 * A dancer's own feedback on a class she's enrolled in, from the portal. One
 * response per dancer per class (per workshop, for a multi-day one): sending
 * again replaces it.
 *
 * Reads and writes with the service role, after checking the caller is a
 * dancer enrolled in the class. Every query is pinned to her student id.
 */

type Authorized =
  | { ok: true; studentId: string; subject: FeedbackSubject; supabase: ReturnType<typeof createAdminClient> }
  | { ok: false; response: NextResponse }

async function authorize(classId: string): Promise<Authorized> {
  let student: { id: string } | null
  try {
    student = await findCurrentDancerStudent()
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const notFound = { ok: false as const, response: NextResponse.json({ error: 'Class not found' }, { status: 404 }) }
  if (!student) return notFound

  const supabase = createAdminClient()
  const subject = await loadFeedbackSubject(supabase, classId)
  if (!subject) return notFound

  const { data: enrollment, error } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', student.id)
    .in('class_id', subject.classIds)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!enrollment) return notFound

  return { ok: true, studentId: student.id, subject, supabase }
}

const FEEDBACK_COLUMNS = 'id, rating, show_name, do_again, more_of, less_of, outcomes, comments, updated_at'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const auth = await authorize(classId)
    if (!auth.ok) return auth.response
    const { supabase, studentId, subject } = auth

    const { data: feedback, error } = await supabase
      .from('class_feedback')
      .select(FEEDBACK_COLUMNS)
      .eq('student_id', studentId)
      .in('class_id', subject.classIds)
      .limit(1)
      .maybeSingle()
    if (error) throw error

    return NextResponse.json({
      heading: feedbackHeading(subject),
      hasStarted: new Date(subject.firstStart).getTime() <= Date.now(),
      feedback,
    })
  } catch (error) {
    console.error('Error loading dancer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const auth = await authorize(classId)
    if (!auth.ok) return auth.response
    const { supabase, studentId, subject } = auth

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const parsed = parseFeedback(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    // The name on file, not one typed in: the instructor sees who it's from
    const { data: studentRow } = await supabase
      .from('students')
      .select('full_name')
      .eq('id', studentId)
      .maybeSingle()
    const name = studentRow?.full_name || (await getCurrentUserWithRole())?.full_name || null
    const values = { ...parsed.values, name }

    const { data: existing, error: existingError } = await supabase
      .from('class_feedback')
      .select('id')
      .eq('student_id', studentId)
      .in('class_id', subject.classIds)
      .limit(1)
      .maybeSingle()
    if (existingError) throw existingError

    const { error } = existing
      ? await supabase.from('class_feedback').update(values).eq('id', existing.id).eq('student_id', studentId)
      : await supabase.from('class_feedback').insert({ ...values, class_id: subject.anchorId, student_id: studentId })
    if (error) {
      console.error('Error saving dancer feedback:', error)
      return NextResponse.json({ error: 'Could not send your feedback. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unexpected error saving dancer feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
