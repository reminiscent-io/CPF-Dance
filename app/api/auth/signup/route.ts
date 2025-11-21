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

    // Map frontend roles to database roles
    const roleMapping: Record<string, string> = {
      'admin': 'instructor', // Admin users get instructor role in DB
      'studio': 'studio_admin', // Map 'studio' to 'studio_admin'
      'instructor': 'instructor',
      'dancer': 'dancer',
      'guardian': 'guardian',
    }
    const dbRole = roleMapping[role] || role

    // Pass user data as metadata - the database trigger will create profile and student records
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || null,
          role: dbRole,
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
      studio: '/studio',
      guardian: '/dancer',
      admin: '/instructor',
    }

    // Use portal preference if provided and matches role, otherwise use role-based redirect
    let redirectUrl = roleRedirects[role as UserRole] || '/dancer'

    // For admin role, respect portal preference
    if (role === 'admin' && portal) {
      const portalRedirects: Record<string, string> = {
        dancer: '/dancer',
        instructor: '/instructor',
        studio: '/studio',
      }
      redirectUrl = portalRedirects[portal] || '/instructor'
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
