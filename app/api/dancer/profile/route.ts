import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireDancer } from '@/lib/auth/server-auth'

export async function GET(request: NextRequest) {
  try {
    const profile = await requireDancer()
    const supabase = await createClient()

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('profile_id', profile.id)
      .single()

    let guardian = null
    if (student && student.guardian_id) {
      const { data: guardianData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('id', student.guardian_id)
        .single()
      guardian = guardianData
    }

    return NextResponse.json({
      profile,
      student,
      guardian
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const profile = await requireDancer()
    const supabase = await createClient()

    const body = await request.json()
    const { profile: profileUpdates, student: studentUpdates } = body

    if (profileUpdates) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileUpdates.full_name,
          phone: profileUpdates.phone,
          date_of_birth: profileUpdates.date_of_birth
        })
        .eq('id', profile.id)

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
    }

    if (studentUpdates) {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('profile_id', profile.id)
        .single()

      if (student) {
        const { error: studentError } = await supabase
          .from('students')
          .update({
            goals: studentUpdates.goals,
            emergency_contact_name: studentUpdates.emergency_contact_name,
            emergency_contact_phone: studentUpdates.emergency_contact_phone
          })
          .eq('id', student.id)

        if (studentError) {
          return NextResponse.json({ error: studentError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
