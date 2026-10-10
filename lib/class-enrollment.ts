import type { SupabaseClient } from '@supabase/supabase-js'
import { workshopOptions, type WorkshopOption } from '@/lib/class-series'

const CLASS_FIELDS = 'id, class_type, series_id, workshop_full_only, is_public, is_cancelled, max_capacity, start_time'

export type EnrollResult =
  | { ok: true; enrollment: { class_id: string } | null; enrolled_days: number }
  | { ok: false; status: number; error: string; already_enrolled?: boolean }

/**
 * Enroll a student in a public class. option: 'full' = the whole workshop,
 * 'day' = just this day. Linked workshops default to the full run;
 * everything else is one class.
 *
 * `db` reads the class and writes the enrollment: the dancer's own client in
 * the enroll route (RLS applies), the service role in the Stripe webhook.
 * `admin` is always the service role, for head counts across dancers.
 */
export async function enrollStudent(
  db: SupabaseClient,
  admin: SupabaseClient,
  studentId: string,
  classId: string,
  option?: WorkshopOption
): Promise<EnrollResult> {
  const fail = (status: number, error: string) => ({ ok: false as const, status, error })

  // Verify the class exists and is public
  const { data: classData, error: classError } = await db
    .from('classes')
    .select(CLASS_FIELDS)
    .eq('id', classId)
    .single()

  if (classError || !classData) return fail(404, 'Class not found')
  if (!classData.is_public) return fail(403, 'This class is not available for public enrollment')
  if (classData.is_cancelled) return fail(400, 'This class has been cancelled')
  if (new Date(classData.start_time) < new Date()) return fail(400, 'Cannot enroll in a past class')

  const options = workshopOptions(classData)
  const chosen: WorkshopOption = option ?? (options.full ? 'full' : 'day')
  if (!options[chosen]) {
    return fail(400, chosen === 'day'
      ? 'This workshop is sold as a full run only'
      : 'This class is not part of a multi-day workshop')
  }
  const workshopPass = chosen === 'full'

  // A full-workshop sign-up enrolls in every upcoming day.
  let days = [classData]
  if (workshopPass) {
    const { data: seriesDays, error: seriesError } = await db
      .from('classes')
      .select(CLASS_FIELDS)
      .eq('series_id', classData.series_id!)
      .eq('is_public', true)
      .eq('is_cancelled', false)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })

    if (seriesError) {
      console.error('Error fetching workshop days:', seriesError)
      return fail(500, 'Failed to enroll in class')
    }
    if (seriesDays && seriesDays.length > 0) days = seriesDays
  }

  const { data: existingEnrollments } = await db
    .from('enrollments')
    .select('class_id, workshop_pass')
    .eq('student_id', studentId)
    .in('class_id', days.map(day => day.id))

  const existingByClass = new Map((existingEnrollments || []).map(row => [row.class_id, row]))
  const toEnroll = days.filter(day => !existingByClass.has(day.id))
  // A dancer who dropped in for a day and then buys the full run: their
  // drop-in becomes part of the pass so earnings don't count them twice.
  const toUpgrade = workshopPass
    ? days.filter(day => existingByClass.get(day.id)?.workshop_pass === false)
    : []

  if (toEnroll.length === 0 && toUpgrade.length === 0) {
    return { ...fail(400, 'You are already enrolled in this class'), already_enrolled: true }
  }

  // Dancers can only read their own enrollments under RLS, so head counts
  // come from the service role. Counts only; no other dancer's data leaves.
  const headCounts = new Map<string, number>()
  if (toEnroll.length > 0) {
    const { data: taken, error: countError } = await admin
      .from('enrollments')
      .select('class_id')
      .in('class_id', toEnroll.map(day => day.id))
    if (countError) {
      console.error('Error counting enrollments:', countError)
      return fail(500, 'Failed to enroll in class')
    }
    for (const row of taken || []) {
      headCounts.set(row.class_id, (headCounts.get(row.class_id) || 0) + 1)
    }
  }

  // Any day of a workshop being full blocks the sign-up
  const fullDay = toEnroll.find(day => day.max_capacity && (headCounts.get(day.id) || 0) >= day.max_capacity)
  if (fullDay) {
    return fail(400, days.length > 1 ? 'One of the workshop days is full' : 'This class is full')
  }

  let enrollments: { class_id: string }[] = []
  if (toEnroll.length > 0) {
    const { data: inserted, error: enrollmentError } = await db
      .from('enrollments')
      .insert(toEnroll.map(day => ({
        student_id: studentId,
        class_id: day.id,
        workshop_pass: workshopPass
      })))
      .select()

    if (enrollmentError || !inserted) {
      console.error('Error creating enrollment:', enrollmentError)
      return fail(500, 'Failed to enroll in class')
    }
    enrollments = inserted
  }

  if (toUpgrade.length > 0) {
    const { error: upgradeError } = await admin
      .from('enrollments')
      .update({ workshop_pass: true })
      .eq('student_id', studentId)
      .in('class_id', toUpgrade.map(day => day.id))
    if (upgradeError) {
      console.error('Error upgrading drop-in enrollments:', upgradeError)
      return fail(500, 'Failed to enroll in class')
    }
  }

  const enrollment = enrollments.find(row => row.class_id === classId) ?? enrollments[0] ?? null
  return { ok: true, enrollment, enrolled_days: days.length }
}
