import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges } from '@/lib/auth/privileges'
import { generateFeedbackToken } from '@/lib/class-feedback'
import { loadFeedbackSubject } from '@/lib/class-feedback-server'

const UNIQUE_VIOLATION = '23505'
const MAX_ATTEMPTS = 5

/**
 * The no-login feedback link for a class: /feedback/<token>. Mints the token
 * the first time and returns the stored one after that. A workshop shares one
 * token across its days, kept on its first day.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden: Only instructors and admins can share feedback links' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = await params

    const subject = await loadFeedbackSubject(supabase, id)
    // Admins can share any class, instructors only their own
    if (!subject || (profile.role !== 'admin' && subject.instructorId !== profile.id)) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 })
    }
    if (subject.feedbackToken) {
      return NextResponse.json({ token: subject.feedbackToken })
    }

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { error } = await supabase
        .from('classes')
        .update({ feedback_token: generateFeedbackToken() })
        .eq('id', subject.anchorId)
        .is('feedback_token', null)
      if (error?.code === UNIQUE_VIOLATION) continue
      if (error) throw error
      break
    }

    // Another request may have set it first; the stored token is the answer
    const { data: stored, error: readError } = await supabase
      .from('classes')
      .select('feedback_token')
      .eq('id', subject.anchorId)
      .maybeSingle()
    if (readError) throw readError
    if (!stored?.feedback_token) {
      return NextResponse.json({ error: 'Could not create feedback link' }, { status: 500 })
    }

    return NextResponse.json({ token: stored.feedback_token })
  } catch (error) {
    console.error('Unexpected error creating feedback link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
