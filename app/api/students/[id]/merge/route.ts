import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireInstructor } from '@/lib/auth/server-auth'

// A failed transfer step. Every child table's student_id FK is ON DELETE
// CASCADE, so deleting the source after a failed move would destroy the rows
// left behind (paid lesson-pack credits included). The route stops instead.
class MergeStepError extends Error {
  constructor(public step: string, public cause: unknown) {
    super(`Merge step failed: ${step}`)
  }
}

function checked<T>(step: string, result: { data: T; error: unknown }): T {
  if (result.error) throw new MergeStepError(step, result.error)
  return result.data
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
    // client can't: payments and lesson_pack_purchases have no instructor
    // UPDATE policy, and enrollments, notes, waivers and relationships only
    // let the caller update rows tied to her own classes, notes or waivers.
    const admin = createAdminClient()

    const recordsTransferred = {
      enrollments: 0,
      notes: 0,
      payments: 0,
      private_lesson_requests: 0,
      lesson_pack_purchases: 0,
      waivers: 0,
      relationships: 0
    }

    // 1. Handle enrollments (must handle unique constraint on student_id + class_id)
    const sourceEnrollments = checked('enrollments', await admin
      .from('enrollments')
      .select('id, class_id')
      .eq('student_id', sourceStudentId))

    const targetEnrollments = checked('enrollments', await admin
      .from('enrollments')
      .select('class_id')
      .eq('student_id', targetStudentId))

    const targetClassIds = new Set(targetEnrollments?.map(e => e.class_id) || [])

    // Delete conflicting enrollments (same class already enrolled in target)
    const conflictingEnrollmentIds = sourceEnrollments
      ?.filter(e => targetClassIds.has(e.class_id))
      .map(e => e.id) || []

    if (conflictingEnrollmentIds.length > 0) {
      checked('enrollments', await admin
        .from('enrollments')
        .delete()
        .in('id', conflictingEnrollmentIds))
    }

    // Update remaining enrollments
    const updatedEnrollments = checked('enrollments', await admin
      .from('enrollments')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select('id'))

    recordsTransferred.enrollments = updatedEnrollments?.length || 0

    // 2. Transfer notes
    const updatedNotes = checked('notes', await admin
      .from('notes')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select('id'))

    recordsTransferred.notes = updatedNotes?.length || 0

    // 3. Transfer payments
    const updatedPayments = checked('payments', await admin
      .from('payments')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select('id'))

    recordsTransferred.payments = updatedPayments?.length || 0

    // 4. Transfer private lesson requests
    const updatedRequests = checked('private_lesson_requests', await admin
      .from('private_lesson_requests')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select('id'))

    recordsTransferred.private_lesson_requests = updatedRequests?.length || 0

    // 5. Transfer lesson pack purchases (their usage rows follow the purchase id)
    const updatedPacks = checked('lesson_pack_purchases', await admin
      .from('lesson_pack_purchases')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select('id'))

    recordsTransferred.lesson_pack_purchases = updatedPacks?.length || 0

    // 6. Transfer waivers
    const updatedWaivers = checked('waivers', await admin
      .from('waivers')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select('id'))

    recordsTransferred.waivers = updatedWaivers?.length || 0

    // 7. Handle instructor_student_relationships
    // Get source relationships
    const sourceRelationships = checked('relationships', await admin
      .from('instructor_student_relationships')
      .select('id, instructor_id')
      .eq('student_id', sourceStudentId))

    // Get target relationships to check for duplicates
    const targetRelationships = checked('relationships', await admin
      .from('instructor_student_relationships')
      .select('instructor_id')
      .eq('student_id', targetStudentId))

    const targetInstructorIds = new Set(targetRelationships?.map(r => r.instructor_id) || [])

    // Delete conflicting relationships (target already has relationship with same instructor)
    const conflictingRelIds = sourceRelationships
      ?.filter(r => targetInstructorIds.has(r.instructor_id))
      .map(r => r.id) || []

    if (conflictingRelIds.length > 0) {
      checked('relationships', await admin
        .from('instructor_student_relationships')
        .delete()
        .in('id', conflictingRelIds))
    }

    // Update remaining relationships
    const updatedRels = checked('relationships', await admin
      .from('instructor_student_relationships')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select('id'))

    recordsTransferred.relationships = updatedRels?.length || 0

    // 8. Merge profile fields using "fill gaps only" strategy
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

    // 9. Delete source student
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
