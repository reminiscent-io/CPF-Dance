import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireInstructor } from '@/lib/auth/server-auth'

// A failed transfer step. Every student_id FK is ON DELETE CASCADE (or SET
// NULL for class_purchases and class_feedback), so deleting the source after
// a failed move would destroy or unlink the rows left behind, paid
// lesson-pack credits included. The route stops instead.
class MergeStepError extends Error {
  constructor(public step: string, public cause: unknown) {
    super(`Merge step failed: ${step}`)
  }
}

function checked<T>(step: string, result: { data: T; error: unknown }): T {
  if (result.error) throw new MergeStepError(step, result.error)
  return result.data
}

type AdminClient = ReturnType<typeof createAdminClient>

type MovedTable =
  | 'notes'
  | 'payments'
  | 'private_lesson_requests'
  | 'lesson_pack_purchases'
  | 'waivers'
  | 'lesson_reschedule_requests'
  | 'class_purchases'
  | 'personal_classes'

// Tables with a unique key that includes student_id, and the other column in it
const UNIQUE_WITH = {
  enrollments: 'class_id',
  instructor_student_relationships: 'instructor_id',
  reviews: 'instructor_id',
  class_feedback: 'class_id'
} as const
type UniqueTable = keyof typeof UNIQUE_WITH

async function moveRows(admin: AdminClient, table: MovedTable | UniqueTable, from: string, to: string) {
  const moved = checked(table, await admin
    .from(table)
    .update({ student_id: to })
    .eq('student_id', from)
    .select('id'))
  return moved?.length || 0
}

// Where the target already has a row for the same class or instructor, the
// target's row wins and the source's is dropped; the rest move.
async function moveRowsKeepingTarget(admin: AdminClient, table: UniqueTable, from: string, to: string) {
  const key = UNIQUE_WITH[table]

  const sourceRows = checked(table, await admin
    .from(table)
    .select(`id, ${key}`)
    .eq('student_id', from)) as unknown as { id: string; [k: string]: unknown }[] | null

  const targetRows = checked(table, await admin
    .from(table)
    .select(key)
    .eq('student_id', to)) as unknown as Record<string, unknown>[] | null

  const taken = new Set(targetRows?.map(r => r[key]) || [])
  const conflictingIds = sourceRows?.filter(r => taken.has(r[key])).map(r => r.id) || []

  if (conflictingIds.length > 0) {
    checked(table, await admin
      .from(table)
      .delete()
      .in('id', conflictingIds))
  }

  return moveRows(admin, table, from, to)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireInstructor()
    const supabase = await createClient()
    const { id: sourceStudentId } = await params
    const body = await request.json()
    const { target_student_id: targetStudentId } = body

    if (!targetStudentId) {
      return NextResponse.json(
        { error: 'Target student ID is required' },
        { status: 400 }
      )
    }

    if (sourceStudentId === targetStudentId) {
      return NextResponse.json(
        { error: 'Cannot merge a student into itself' },
        { status: 400 }
      )
    }

    // Fetch source student (must be unlinked)
    const { data: sourceStudent, error: sourceError } = await supabase
      .from('students')
      .select('*')
      .eq('id', sourceStudentId)
      .single()

    if (sourceError || !sourceStudent) {
      return NextResponse.json(
        { error: 'Source student not found' },
        { status: 404 }
      )
    }

    if (sourceStudent.profile_id) {
      return NextResponse.json(
        { error: 'Source student is already linked to a dancer account. Only unlinked students can be merged.' },
        { status: 400 }
      )
    }

    // Fetch target student (must be linked)
    const { data: targetStudent, error: targetError } = await supabase
      .from('students')
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email)
      `)
      .eq('id', targetStudentId)
      .single()

    if (targetError || !targetStudent) {
      return NextResponse.json(
        { error: 'Target student not found' },
        { status: 404 }
      )
    }

    if (!targetStudent.profile_id) {
      return NextResponse.json(
        { error: 'Target student must be linked to a dancer account' },
        { status: 400 }
      )
    }

    // The caller is an authorized instructor and the merge moves the student's
    // whole record, so the transfers run with the service role. The session
    // client can't: payments, lesson_pack_purchases, reviews, class_feedback
    // and personal_classes have no instructor UPDATE policy, and enrollments,
    // notes, waivers and relationships only let the caller update rows tied
    // to her own classes, notes or waivers.
    const admin = createAdminClient()

    const move = (table: MovedTable) => moveRows(admin, table, sourceStudentId, targetStudentId)
    const moveUnique = (table: UniqueTable) =>
      moveRowsKeepingTarget(admin, table, sourceStudentId, targetStudentId)

    // Every table with a student_id FK. Steps run in order and stop at the
    // first failure, before the source student is deleted.
    const recordsTransferred = {
      enrollments: await moveUnique('enrollments'),
      notes: await move('notes'),
      payments: await move('payments'),
      private_lesson_requests: await move('private_lesson_requests'),
      // Usage rows follow the purchase id
      lesson_pack_purchases: await move('lesson_pack_purchases'),
      waivers: await move('waivers'),
      relationships: await moveUnique('instructor_student_relationships'),
      lesson_reschedule_requests: await move('lesson_reschedule_requests'),
      reviews: await moveUnique('reviews'),
      class_purchases: await move('class_purchases'),
      class_feedback: await moveUnique('class_feedback'),
      personal_classes: await move('personal_classes')
    }

    // Fill the target's empty profile fields from the source
    const profileFields = [
      'age_group',
      'skill_level',
      'goals',
      'medical_notes',
      'emergency_contact_name',
      'emergency_contact_phone'
    ] as const

    const profileUpdates: Record<string, string> = {}
    for (const field of profileFields) {
      // Only copy if target field is empty and source has value
      if (!targetStudent[field] && sourceStudent[field]) {
        profileUpdates[field] = sourceStudent[field]
      }
    }

    if (Object.keys(profileUpdates).length > 0) {
      checked('profile fields', await supabase
        .from('students')
        .update(profileUpdates)
        .eq('id', targetStudentId))
    }

    // Delete the source student
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', sourceStudentId)

    if (deleteError) {
      console.error('Error deleting source student:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete source student after merge' },
        { status: 500 }
      )
    }

    // Fetch updated target student
    const { data: mergedStudent } = await supabase
      .from('students')
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email, phone, date_of_birth),
        guardian:profiles!students_guardian_id_fkey(full_name, email, phone)
      `)
      .eq('id', targetStudentId)
      .single()

    const profile = Array.isArray(targetStudent.profile)
      ? targetStudent.profile[0]
      : targetStudent.profile

    return NextResponse.json({
      success: true,
      merged_student: mergedStudent,
      records_transferred: recordsTransferred,
      message: `Successfully merged student into ${profile?.full_name || 'dancer account'}`
    })
  } catch (error) {
    if (error instanceof MergeStepError) {
      console.error(`Merge failed moving ${error.step}:`, error.cause)
      // Steps run in order and each moves by student_id, so a retry picks up
      // whatever is still on the source.
      return NextResponse.json(
        { error: `Merge stopped while moving ${error.step}. The source student was kept; run the merge again to finish.` },
        { status: 500 }
      )
    }
    console.error('Unexpected error during merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
