import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface BatchInstance {
  start_time: string
  end_time: string | null
}

interface BatchPayload {
  title: string
  instructor_name?: string | null
  location?: string | null
  notes?: string | null
  instances: BatchInstance[]
}

const MAX_BATCH_SIZE = 200

/**
 * POST /api/dancer/personal-classes/batch
 *
 * Creates many personal-class rows from one shared template + per-instance
 * times. Atomic-ish: a single Supabase insert with multiple rows. If the
 * insert fails, none of the rows are written. If anything succeeds, we report
 * the saved IDs back so the client can re-render without a refetch.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('profile_id', user.id)
      .single()
    if (studentError || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
    }

    const body = (await request.json()) as BatchPayload
    const { title, instructor_name, location, notes, instances } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }
    if (!Array.isArray(instances) || instances.length === 0) {
      return NextResponse.json({ error: 'At least one instance is required' }, { status: 400 })
    }
    if (instances.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: `Cannot create more than ${MAX_BATCH_SIZE} classes at once` },
        { status: 400 }
      )
    }
    for (const inst of instances) {
      if (!inst?.start_time) {
        return NextResponse.json({ error: 'Every instance needs a start time' }, { status: 400 })
      }
    }

    const sharedTitle = title.trim()
    const sharedInstructor = instructor_name?.trim() || null
    const sharedLocation = location?.trim() || null
    const sharedNotes = notes?.trim() || null

    const rows = instances.map((inst) => ({
      student_id: student.id,
      title: sharedTitle,
      instructor_name: sharedInstructor,
      location: sharedLocation,
      start_time: inst.start_time,
      end_time: inst.end_time || null,
      notes: sharedNotes,
      is_recurring: true,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('personal_classes')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('Error batch-inserting personal classes:', insertError)
      return NextResponse.json(
        { error: 'Failed to create classes', detail: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        created: inserted?.length ?? 0,
        classes: inserted ?? [],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/dancer/personal-classes/batch:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
