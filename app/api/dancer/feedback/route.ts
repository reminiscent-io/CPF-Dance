import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { findCurrentDancerStudent } from '@/lib/auth/server-auth'
import { formatFeedbackDates } from '@/lib/class-feedback'

/** How long after a class ends the dashboard keeps asking about it */
const ASK_FOR_DAYS = 14

interface ClassRow {
  id: string
  title: string
  class_type: string
  series_id: string | null
  start_time: string
  end_time: string
  is_cancelled: boolean | null
}

/** One entry per workshop run, one per anything else */
function groupKey(cls: { id: string; class_type: string; series_id: string | null }): string {
  return cls.class_type === 'workshop' && cls.series_id ? `series:${cls.series_id}` : `class:${cls.id}`
}

/**
 * Recent classes the dancer hasn't given feedback on, for the dashboard's
 * "How was it?" prompt. A workshop shows up once its last day (of the days
 * she's enrolled in) has started, and drops off two weeks after it ends.
 */
export async function GET() {
  try {
    let student: { id: string } | null
    try {
      student = await findCurrentDancerStudent()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!student) return NextResponse.json({ pending: [] })

    const supabase = await createClient()
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('classes(id, title, class_type, series_id, start_time, end_time, is_cancelled)')
      .eq('student_id', student.id)
    if (error) {
      console.error('Error loading enrollments for feedback prompts:', error)
      return NextResponse.json({ error: 'Failed to load classes' }, { status: 500 })
    }

    const groups = new Map<string, ClassRow[]>()
    for (const row of enrollments || []) {
      const cls = row.classes as ClassRow | null
      if (!cls || cls.is_cancelled) continue
      const key = groupKey(cls)
      groups.set(key, [...(groups.get(key) || []), cls])
    }

    const now = Date.now()
    const cutoff = now - ASK_FOR_DAYS * 24 * 60 * 60 * 1000
    const recent = [...groups.entries()].filter(([, days]) => {
      const lastStart = Math.max(...days.map(day => new Date(day.start_time).getTime()))
      const lastEnd = Math.max(...days.map(day => new Date(day.end_time).getTime()))
      return lastStart <= now && lastEnd >= cutoff
    })
    if (recent.length === 0) return NextResponse.json({ pending: [] })

    // Workshop feedback sits on the first day, which she may not be enrolled
    // in, so this reads past the classes policy. Pinned to her student id.
    const admin = createAdminClient()
    const { data: given, error: givenError } = await admin
      .from('class_feedback')
      .select('classes(id, class_type, series_id)')
      .eq('student_id', student.id)
    if (givenError) {
      console.error('Error loading given feedback:', givenError)
      return NextResponse.json({ error: 'Failed to load feedback' }, { status: 500 })
    }
    const reviewed = new Set(
      (given || []).flatMap(row => (row.classes ? [groupKey(row.classes)] : []))
    )

    // Most recently taught first
    const pending = recent
      .filter(([key]) => !reviewed.has(key))
      .map(([, days]) => [...days].sort((a, b) => a.start_time.localeCompare(b.start_time)))
      .sort((a, b) => b[b.length - 1].start_time.localeCompare(a[a.length - 1].start_time))
      .map(sorted => ({
        class_id: sorted[0].id,
        title: sorted[0].title,
        class_type: sorted[0].class_type,
        dates: formatFeedbackDates(sorted.map(day => day.start_time)),
      }))

    return NextResponse.json({ pending })
  } catch (error) {
    console.error('Unexpected error loading feedback prompts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
