import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, linked_profile_id')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Middleware profile fetch error:', error)
      // If profile doesn't exist, try to get role from user metadata as fallback
      if (user.user_metadata?.role) {
        console.log('Using role from user_metadata:', user.user_metadata.role)
        profile = { id: user.id, role: user.user_metadata.role }
      }
    } else {
      profile = data

      // Check if this profile is linked to a primary profile
      if (profile.linked_profile_id) {
        const { data: primaryProfile, error: primaryError } = await supabase
          .from('profiles')
          .select('id, role, linked_profile_id')
          .eq('id', profile.linked_profile_id)
          .single()

        // If primary profile exists, use it instead
        if (!primaryError && primaryProfile) {
          profile = primaryProfile
        } else {
          console.warn(`Middleware: Linked profile ${profile.linked_profile_id} not found for user ${user.id}`)
        }
      }
    }
  }

  return { response: supabaseResponse, user, profile }
}
