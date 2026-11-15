/**
 * Server-side lookups for class feedback (lib/class-feedback.ts has the rest).
 * Callers pick the client: the no-login link has no user to authorize, so its
 * routes pass the service-role client; they only ever return what the form
 * shows anyway (title, dates, instructor name).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { formatFeedbackDates, type FeedbackHeading } from '@/lib/class-feedback'

type Client = SupabaseClient<Database>

interface DayRow {
  id: string
  start_time: string
  end_time: string
  is_cancelled: boolean | null
  feedback_token: string | null
}

export interface FeedbackSubject {
  /** Where feedback is stored: the class itself, or a workshop's first day */
  anchorId: string
  /** Every class the feedback covers: the class, or each day of the workshop */
  classIds: string[]
  title: string
  classType: string
  instructorId: string
  instructorName: string | null
  /** "November 14 & 15, 2026", leaving out cancelled days */
  dates: string
  /** Start of the first day that wasn't cancelled */
  firstStart: string
  /** End of the last day that wasn't cancelled */
  lastEnd: string
  /** The /feedback/<token> key, once the instructor has asked for the link */
  feedbackToken: string | null
  /** Every day was cancelled */
  isCancelled: boolean
}

/** The class, workshop or lesson that feedback on `classId` belongs to */
export async function loadFeedbackSubject(supabase: Client, classId: string): Promise<FeedbackSubject | null> {
  const { data: cls, error } = await supabase
    .from('classes')
    .select('id, title, class_type, series_id, instructor_id, start_time, end_time, is_cancelled, feedback_token')
    .eq('id', classId)
    .maybeSingle()
  if (error) throw error
  if (!cls) return null

  // A workshop is reviewed as one run, so every day resolves to the same subject
  let days: DayRow[] = [cls]
  if (cls.class_type === 'workshop' && cls.series_id) {
    const { data, error: seriesError } = await supabase
      .from('classes')
      .select('id, start_time, end_time, is_cancelled, feedback_token')
      .eq('series_id', cls.series_id)
      .order('start_time', { ascending: true })
    if (seriesError) throw seriesError
    if (data && data.length > 0) days = data
  }

  // The token stays where it was minted, even if an earlier day is added later
  const anchor = days.find(day => day.feedback_token) ?? days[0]
  const held = days.filter(day => !day.is_cancelled)
  const shown = held.length > 0 ? held : days

  const { data: instructor } = await supabase
    .from('public_profiles')
    .select('full_name')
    .eq('id', cls.instructor_id)
    .maybeSingle()
  const instructorName = instructor?.full_name ?? null

  return {
    anchorId: anchor.id,
    classIds: days.map(day => day.id),
    title: cls.title,
    classType: cls.class_type,
    instructorId: cls.instructor_id,
    instructorName,
    dates: formatFeedbackDates(shown.map(day => day.start_time)),
    firstStart: shown[0].start_time,
    lastEnd: shown[shown.length - 1].end_time,
    feedbackToken: anchor.feedback_token,
    isCancelled: held.length === 0,
  }
}

/** The class a /feedback/<token> link names, or null */
export async function findClassIdByFeedbackToken(supabase: Client, token: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('id')
    .eq('feedback_token', token)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

/** What the form shows above the questions, and nothing else */
export function feedbackHeading(subject: FeedbackSubject): FeedbackHeading {
  return {
    title: subject.title,
    classType: subject.classType,
    dates: subject.dates,
    instructorName: subject.instructorName,
  }
}
