import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentDancerStudent } from '@/lib/auth/server-auth'
import { workshopOptions, type WorkshopOption } from '@/lib/class-series'

export async function POST(request: NextRequest) {
  try {
    const student = await getCurrentDancerStudent()
    const supabase = await createClient()
    // option: 'full' = the whole workshop, 'day' = just this day. Linked
    // workshops default to the full run; everything else is one class.
    const { class_id, option } = await request.json() as { class_id?: string; option?: WorkshopOption }

    if (!class_id) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 })
    }

    // Verify the class exists and is public
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, class_type, series_id, workshop_full_only, is_public, is_cancelled, max_capacity, start_time')
      .eq('id', class_id)
      .single()

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (!classData.is_public) {
      return NextResponse.json({ error: 'This class is not available for public enrollment' }, { status: 403 })
    }

    if (classData.is_cancelled) {
      return NextResponse.json({ error: 'This class has been cancelled' }, { status: 400 })
    }

    // Check if class is in the past
    if (new Date(classData.start_time) < new Date()) {
      return NextResponse.json({ error: 'Cannot enroll in a past class' }, { status: 400 })
    }

    const options = workshopOptions(classData)
    const chosen: WorkshopOption = option ?? (options.full ? 'full' : 'day')
    if (!options[chosen]) {
      return NextResponse.json({
        error: chosen === 'day'
          ? 'This workshop is sold as a full run only'
          : 'This class is not part of a multi-day workshop'
      }, { status: 400 })
    }
    const workshopPass = chosen === 'full'

    // A full-workshop sign-up enrolls in every upcoming day.
    let days = [classData]
    if (workshopPass) {
      const { data: seriesDays, error: seriesError } = await supabase
        .from('classes')
        .select('id, class_type, series_id, workshop_full_only, is_public, is_cancelled, max_capacity, start_time')
        .eq('series_id', classData.series_id!)
        .eq('is_public', true)
        .eq('is_cancelled', false)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (seriesError) {
        console.error('Error fetching workshop days:', seriesError)
        return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 })
      }
      if (seriesDays && seriesDays.length > 0) days = seriesDays
    }

    const { data: existingEnrollments } = await supabase
      .from('enrollments')
      .select('class_id, workshop_pass')
      .eq('student_id', student.id)
      .in('class_id', days.map(day => day.id))

    const existingByClass = new Map((existingEnrollments || []).map(row => [row.class_id, row]))
    const toEnroll = days.filter(day => !existingByClass.has(day.id))
    // A dancer who dropped in for a day and then buys the full run: their
    // drop-in becomes part of the pass so earnings don't count them twice.
    const toUpgrade = workshopPass
      ? days.filter(day => existingByClass.get(day.id)?.workshop_pass === false)
      : []

    if (toEnroll.length === 0 && toUpgrade.length === 0) {
      return NextResponse.json({ error: 'You are already enrolled in this class' }, { status: 400 })
    }

    // Dancers can only read their own enrollments under RLS, so head counts
    // come from the service role. Counts only; no other dancer's data leaves.
    const admin = createAdminClient()
    const headCounts = new Map<string, number>()
    if (toEnroll.length > 0) {
      const { data: taken, error: countError } = await admin
        .from('enrollments')
        .select('class_id')
        .in('class_id', toEnroll.map(day => day.id))
      if (countError) {
        console.error('Error counting enrollments:', countError)
        return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 })
      }
      for (const row of taken || []) {
        headCounts.set(row.class_id, (headCounts.get(row.class_id) || 0) + 1)
      }
    }

    // Check if class is full (any day of a workshop being full blocks the sign-up)
    const fullDay = toEnroll.find(day => day.max_capacity && (headCounts.get(day.id) || 0) >= day.max_capacity)
    if (fullDay) {
      return NextResponse.json({
        error: days.length > 1 ? 'One of the workshop days is full' : 'This class is full'
      }, { status: 400 })
    }

    // Create enrollment
    let enrollments: { class_id: string }[] = []
    if (toEnroll.length > 0) {
      const { data: inserted, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert(toEnroll.map(day => ({
          student_id: student.id,
          class_id: day.id,
          workshop_pass: workshopPass
        })))
        .select()

      if (enrollmentError || !inserted) {
        console.error('Error creating enrollment:', enrollmentError)
        return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 })
      }
      enrollments = inserted
    }

    if (toUpgrade.length > 0) {
      const { error: upgradeError } = await admin
        .from('enrollments')
        .update({ workshop_pass: true })
        .eq('student_id', student.id)
        .in('class_id', toUpgrade.map(day => day.id))
      if (upgradeError) {
        console.error('Error upgrading drop-in enrollments:', upgradeError)
        return NextResponse.json({ error: 'Failed to enroll in class' }, { status: 500 })
      }
    }

    const enrollment = enrollments.find(row => row.class_id === class_id) ?? enrollments[0] ?? null

    return NextResponse.json({ enrollment, enrolled_days: days.length }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
