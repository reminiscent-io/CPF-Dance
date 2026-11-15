import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeedbackToken, parseFeedback } from '@/lib/class-feedback'
import { findClassIdByFeedbackToken, loadFeedbackSubject } from '@/lib/class-feedback-server'

/**
 * Feedback sent from the no-login /feedback/<token> link. Public on purpose:
 * holding the link is the permission. Each send adds a response; nothing here
 * can read, change or delete one.
 *
 * Uses the service role because there's no signed-in user, and only after the
 * token has matched a class.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!isFeedbackToken(token)) {
      return NextResponse.json({ error: 'This feedback link is not valid' }, { status: 404 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // A field people never see; bots fill it in. Pretend it worked.
    if (body && typeof body === 'object' && (body as Record<string, unknown>).website) {
      return NextResponse.json({ ok: true })
    }

    const parsed = parseFeedback(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const supabase = createAdminClient()
    const classId = await findClassIdByFeedbackToken(supabase, token)
    const subject = classId ? await loadFeedbackSubject(supabase, classId) : null
    if (!subject) {
      return NextResponse.json({ error: 'This feedback link is not valid' }, { status: 404 })
    }

    const { error } = await supabase
      .from('class_feedback')
      .insert({ class_id: subject.anchorId, ...parsed.values })
    if (error) {
      console.error('Error saving link feedback:', error)
      return NextResponse.json({ error: 'Could not send your feedback. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Unexpected error saving link feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
