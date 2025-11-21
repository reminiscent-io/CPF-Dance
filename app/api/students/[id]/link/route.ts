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
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { id } = await params

    // Find the student record
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*, profile:profiles!students_profile_id_fkey(id, email)')
      .eq('id', id)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Find dancer profile with matching email
    const { data: dancerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'dancer')
      .maybeSingle()

    if (profileError) {
      console.error('Error finding dancer profile:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (!dancerProfile) {
      return NextResponse.json(
        { error: 'No dancer account found with that email. The dancer needs to sign up first.' },
        { status: 404 }
      )
    }

    // Check if this dancer profile is already linked to a different student
    const { data: existingStudent, error: existingError } = await supabase
      .from('students')
      .select('id, profile:profiles!students_profile_id_fkey(full_name)')
      .eq('profile_id', dancerProfile.id)
      .neq('id', id)
      .maybeSingle()

    if (existingError) {
      console.error('Error checking existing student:', existingError)
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (existingStudent) {
      const profile = Array.isArray(existingStudent.profile) ? existingStudent.profile[0] : existingStudent.profile
      return NextResponse.json(
        { error: `This dancer account is already linked to another student: ${profile?.full_name || 'Unknown'}` },
        { status: 400 }
      )
    }

    // Update the student record to link to the dancer profile
    const { data: updatedStudent, error: updateError } = await supabase
      .from('students')
      .update({ profile_id: dancerProfile.id })
      .eq('id', id)
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(full_name, email, phone, date_of_birth),
        guardian:profiles!students_guardian_id_fkey(full_name, email, phone)
      `)
      .single()

    if (updateError) {
      console.error('Error linking student:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // If there was an old unlinked profile (one created by instructor without auth),
    // we should consider deleting it, but for safety we'll leave it for now
    // The instructor can manually clean up if needed

    return NextResponse.json({
      student: updatedStudent,
      message: `Successfully linked student to dancer account: ${dancerProfile.full_name}`
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
