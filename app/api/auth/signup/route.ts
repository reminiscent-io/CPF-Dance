import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, phone, role, isAtLeast13, guardianEmail, portal } = body

    const supabase = await createClient()

    let guardianId = null

    // If guardian email is provided, create or get guardian profile
    if (guardianEmail && !isAtLeast13 && role === 'dancer') {
      // Check if guardian profile already exists
      const { data: existingGuardian } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', guardianEmail)
        .single()

      if (existingGuardian) {
        guardianId = existingGuardian.id
      } else {
        // Create guardian profile (no auth account, just a profile entry)
        const { data: newGuardian, error: guardianError } = await supabase
          .from('profiles')
          .insert({
            email: guardianEmail,
            full_name: null, // Guardian can fill this in later
            role: 'guardian',
            consent_given: false, // They need to provide consent
          })
          .select('id')
          .single()

        if (guardianError) {
          console.error('Error creating guardian profile:', guardianError)
        } else if (newGuardian) {
          guardianId = newGuardian.id
        }
      }
    }

    // Pass user data as metadata - the database trigger will create profile and student records
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          role: role,
          guardian_id: guardianId,
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
    // If guardianId exists, it will be linked to the profile

    const roleRedirects: Record<UserRole, string> = {
      instructor: '/instructor',
      dancer: '/dancer',
      guardian: '/dancer',
      admin: '/instructor',
    }

    // For admin role, allow access to any portal
    let redirectUrl: string
    if (role === 'admin') {
      // Admins can use any portal - dancer or instructor
      const portalRedirects: Record<string, string> = {
        dancer: '/dancer',
        instructor: '/instructor',
      }
      redirectUrl = portalRedirects[portal] || '/instructor'
    } else {
      // Use role-based redirect for non-admin users
      redirectUrl = roleRedirects[role as UserRole] || '/dancer'
    }

    return NextResponse.json({
      success: true,
      redirectUrl,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
