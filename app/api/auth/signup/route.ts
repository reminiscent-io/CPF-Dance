import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, phone, role, dateOfBirth, guardianEmail } = body

    const supabase = await createClient()

    // Pass user data as metadata - the database trigger will create profile and student records
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          role: role,
          date_of_birth: dateOfBirth || null,
        }
      }
    })

    if (signUpError) {
      console.error('Supabase signup error:', signUpError)
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 400 })
    }

    // Profile and student records are automatically created by the database trigger

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
