import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Get user profile to determine redirect
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      const roleRedirects: Record<string, string> = {
        instructor: '/instructor',
        dancer: '/dancer',
        studio_admin: '/studio',
      }

      return NextResponse.redirect(new URL(roleRedirects[profile.role] || '/dancer', requestUrl.origin))
    }
  }

  // Fallback to login if something went wrong
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}
