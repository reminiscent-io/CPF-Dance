import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, portal } = body

    console.log('Signin attempt for:', email, 'portal:', portal)

    const supabase = await createClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Signin error:', error)
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'No user returned' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    const userRole = profile.role as UserRole

    // Default role-based redirects
    const roleRedirects: Record<UserRole, string> = {
      instructor: '/instructor',
      dancer: '/dancer',
      studio: '/studio',
      studio_admin: '/studio',
      guardian: '/dancer',
      admin: '/instructor',
    }

    let redirectUrl: string

    // Admin users can access any portal they selected
    if (userRole === 'admin' && portal) {
      const portalRedirects: Record<string, string> = {
        dancer: '/dancer',
        instructor: '/instructor',
        studio: '/studio',
      }
      redirectUrl = portalRedirects[portal] || '/instructor'
    } else {
      // Non-admin users go to their role-specific portal regardless of selection
      redirectUrl = roleRedirects[userRole] || '/dancer'
    }

    console.log('Signin successful for:', authData.user.email, 'role:', profile.role, 'redirecting to:', redirectUrl)

    return NextResponse.json({
      success: true,
      redirectUrl,
    })
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
