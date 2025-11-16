import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
      }

      if (profile) {
        const roleRedirects: Record<UserRole, string> = {
          instructor: '/instructor',
          dancer: '/dancer',
          studio_admin: '/studio',
          guardian: '/dancer',
        }

        console.log('Signin successful, redirecting to:', roleRedirects[profile.role as UserRole])
        return NextResponse.json({
          success: true,
          redirectUrl: roleRedirects[profile.role as UserRole] || '/dancer',
        })
      } else {
        console.log('No profile found, using default redirect')
      }
    }

    return NextResponse.json({
      success: true,
      redirectUrl: '/dancer',
    })
  } catch (error) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
