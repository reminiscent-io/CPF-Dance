import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

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

    const roleRedirects: Record<UserRole, string> = {
      instructor: '/instructor',
      dancer: '/dancer',
      studio_admin: '/studio',
      guardian: '/dancer',
    }

    const redirectUrl = roleRedirects[profile.role as UserRole] || '/dancer'

    console.log('Signin successful for:', authData.user.email, 'role:', profile.role, 'redirecting to:', redirectUrl)

    // Create response with proper headers
    const response = NextResponse.json({
      success: true,
      redirectUrl,
    })

    return response
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
