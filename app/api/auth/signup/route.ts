import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, phone, role, dateOfBirth, guardianEmail } = body

    const supabase = await createClient()

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 400 })
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      email,
      phone: phone || null,
      full_name: fullName,
      role,
      date_of_birth: dateOfBirth || null,
      consent_given: false,
    })

    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to create profile: ' + profileError.message },
        { status: 400 }
      )
    }

    if (role === 'dancer') {
      const { error: studentError } = await supabase.from('students').insert({
        profile_id: authData.user.id,
        is_active: true,
      })

      if (studentError) {
        console.error('Failed to create student record:', studentError)
      }
    }

    const roleRedirects: Record<UserRole, string> = {
      instructor: '/instructor',
      dancer: '/dancer',
      studio_admin: '/studio',
      guardian: '/dancer',
    }

    return NextResponse.json({
      success: true,
      redirectUrl: roleRedirects[role as UserRole] || '/dancer',
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
