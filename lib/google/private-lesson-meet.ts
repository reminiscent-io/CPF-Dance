import type { SupabaseClient } from '@supabase/supabase-js'
import { createMeetEvent } from '@/lib/google/calendar'
import { notifyDancerVirtualLesson } from '@/lib/notifications/private-lessons'

export interface PrivateLessonDancer {
  name: string
  email: string
}

/** Resolves display name + email for a student, whether or not they have a linked profile. */
export async function getPrivateLessonDancer(
  admin: SupabaseClient,
  studentId: string
): Promise<PrivateLessonDancer> {
  const { data: studentRow } = await admin
    .from('students')
    .select('full_name, email, profile:profiles!students_profile_id_fkey(full_name, email)')
    .eq('id', studentId)
    .single()
  const studentProfile = Array.isArray(studentRow?.profile)
    ? studentRow?.profile[0]
    : studentRow?.profile
  return {
    name: studentRow?.full_name || studentProfile?.full_name || 'Dancer',
    email: studentRow?.email || studentProfile?.email || '',
  }
}

/**
 * Creates a Google Meet on Courtney's calendar for a virtual private lesson,
 * stores the link on the class row (mutating `classData` to match), and
 * optionally emails the dancer the link. The calendar invite itself goes out
 * via Google (`sendUpdates=all`) whenever the dancer has an email.
 * Throws on Calendar failure — callers treat this as best-effort.
 */
export async function attachMeetToPrivateLesson(args: {
  admin: SupabaseClient
  classData: { id: string; start_time: string; end_time: string; google_meet_url?: string | null; google_calendar_event_id?: string | null }
  title: string
  description?: string | null
  dancer: PrivateLessonDancer
  emailDancer: boolean
}): Promise<{ url: string; dancerHasEmail: boolean; dancerNotified: boolean }> {
  const { admin, classData, dancer } = args

  const { hangoutLink, eventId } = await createMeetEvent({
    classId: classData.id,
    summary: args.title,
    description: args.description,
    startIso: classData.start_time,
    endIso: classData.end_time,
    attendeeEmails: dancer.email ? [dancer.email] : [],
  })

  await admin
    .from('classes')
    .update({ google_meet_url: hangoutLink, google_calendar_event_id: eventId })
    .eq('id', classData.id)

  classData.google_meet_url = hangoutLink
  classData.google_calendar_event_id = eventId

  const dancerNotified = Boolean(args.emailDancer && dancer.email && hangoutLink)
  if (dancerNotified) {
    await notifyDancerVirtualLesson({
      to: dancer.email,
      dancerName: dancer.name,
      startTimeIso: classData.start_time,
      meetUrl: hangoutLink,
    })
  }

  return { url: hangoutLink, dancerHasEmail: Boolean(dancer.email), dancerNotified }
}
