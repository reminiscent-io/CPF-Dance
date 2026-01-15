import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireInstructor } from '@/lib/auth/server-auth'

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
    const { data: sourceEnrollments } = await supabase
      .from('enrollments')
      .select('id, class_id')
      .eq('student_id', sourceStudentId)

    const { data: targetEnrollments } = await supabase
      .from('enrollments')
      .select('class_id')
      .eq('student_id', targetStudentId)

    const targetClassIds = new Set(targetEnrollments?.map(e => e.class_id) || [])

    // Delete conflicting enrollments (same class already enrolled in target)
    const conflictingEnrollmentIds = sourceEnrollments
      ?.filter(e => targetClassIds.has(e.class_id))
      .map(e => e.id) || []

    if (conflictingEnrollmentIds.length > 0) {
      await supabase
        .from('enrollments')
        .delete()
        .in('id', conflictingEnrollmentIds)
    }

    // Update remaining enrollments
    const { data: updatedEnrollments } = await supabase
      .from('enrollments')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select()

    recordsTransferred.enrollments = updatedEnrollments?.length || 0

    // 2. Transfer notes
    const { data: updatedNotes } = await supabase
      .from('notes')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select()

    recordsTransferred.notes = updatedNotes?.length || 0

    // 3. Transfer payments
    const { data: updatedPayments } = await supabase
      .from('payments')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select()

    recordsTransferred.payments = updatedPayments?.length || 0

    // 4. Transfer private lesson requests
    const { data: updatedRequests } = await supabase
      .from('private_lesson_requests')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select()

    recordsTransferred.private_lesson_requests = updatedRequests?.length || 0

    // 5. Transfer lesson pack purchases
    const { data: updatedPacks } = await supabase
      .from('lesson_pack_purchases')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select()

    recordsTransferred.lesson_pack_purchases = updatedPacks?.length || 0

    // 6. Transfer waivers
    const { data: updatedWaivers } = await supabase
      .from('waivers')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select()

    recordsTransferred.waivers = updatedWaivers?.length || 0

    // 7. Handle instructor_student_relationships
    // Get source relationships
    const { data: sourceRelationships } = await supabase
      .from('instructor_student_relationships')
      .select('id, instructor_id')
      .eq('student_id', sourceStudentId)

    // Get target relationships to check for duplicates
    const { data: targetRelationships } = await supabase
      .from('instructor_student_relationships')
      .select('instructor_id')
      .eq('student_id', targetStudentId)

    const targetInstructorIds = new Set(targetRelationships?.map(r => r.instructor_id) || [])

    // Delete conflicting relationships (target already has relationship with same instructor)
    const conflictingRelIds = sourceRelationships
      ?.filter(r => targetInstructorIds.has(r.instructor_id))
      .map(r => r.id) || []

    if (conflictingRelIds.length > 0) {
      await supabase
        .from('instructor_student_relationships')
        .delete()
        .in('id', conflictingRelIds)
    }

    // Update remaining relationships
    const { data: updatedRels } = await supabase
      .from('instructor_student_relationships')
      .update({ student_id: targetStudentId })
      .eq('student_id', sourceStudentId)
      .select()

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
      await supabase
        .from('students')
        .update(profileUpdates)
        .eq('id', targetStudentId)
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
    console.error('Unexpected error during merge:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
