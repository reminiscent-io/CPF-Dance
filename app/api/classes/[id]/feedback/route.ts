import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/auth/server-auth'
import { hasInstructorPrivileges } from '@/lib/auth/privileges'
import { loadFeedbackSubject } from '@/lib/class-feedback-server'

/**
 * Every response on a class, newest first. For a workshop that's the whole
 * run's, whichever day the instructor opened.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentUserWithRole()
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!hasInstructorPrivileges(profile)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = await createClient()
    const { id } = await params

    const subject = await loadFeedbackSubject(supabase, id)
    if (!subject || (profile.role !== 'admin' && subject.instructorId !== profile.id)) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('class_feedback')
      .select('id, name, rating, show_name, do_again, more_of, less_of, outcomes, comments, created_at, updated_at, student_id, student:students(full_name)')
      .in('class_id', subject.classIds)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading class feedback:', error)
      return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 })
    }

    const feedback = (data || []).map(({ student, ...row }) => ({
      ...row,
      // A portal response names the dancer on file; a link one, whoever typed
      name: student?.full_name || row.name,
    }))

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Unexpected error loading class feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
