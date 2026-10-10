import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/types'
import { getPostAuthPath, getSafeNextPath } from '@/lib/auth/portal-routing'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, portal, next } = body

    const supabase = await createClient()

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Signin error:', error)
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'No user returned' }, { status: 401 })
    }

    // Get role from user metadata (set during signup)
    const userRole = (authData.user.user_metadata?.role || 'dancer') as UserRole

    // Default role-based redirects
    const roleRedirects: Record<UserRole, string> = {
      instructor: '/instructor',
      dancer: '/dancer',
      guardian: '/dancer',
      admin: '/instructor',
    }

    let redirectUrl: string

    // A deep link (e.g. a shared class) wins over the portal default
    if (getSafeNextPath(next)) {
      redirectUrl = getPostAuthPath(userRole, next) || roleRedirects[userRole] || '/dancer'
    } else if (userRole === 'admin' && portal) {
      // Admin users can access any portal they selected
      const portalRedirects: Record<string, string> = {
        dancer: '/dancer',
        instructor: '/instructor',
      }
      redirectUrl = portalRedirects[portal] || '/instructor'
    } else {
      // Non-admin users go to their role-specific portal regardless of selection
      redirectUrl = roleRedirects[userRole] || '/dancer'
    }

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
