import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { response, user, profile } = await updateSession(request)

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup')
  const isInstructorPage = request.nextUrl.pathname.startsWith('/instructor')
  const isDancerPage = request.nextUrl.pathname.startsWith('/dancer')
  const isPortalPage = isInstructorPage || isDancerPage

  if (isPortalPage) {
    const cookies = request.cookies.getAll()
    const supabaseCookies = cookies.filter(c => c.name.includes('supabase'))
    console.log('Proxy check:', {
      path: request.nextUrl.pathname,
      hasUser: !!user,
      hasProfile: !!profile,
      profileRole: profile?.role,
      cookieCount: cookies.length,
      supabaseCookieCount: supabaseCookies.length
    })
  }

  if (!user && isPortalPage) {
    console.log('No user, redirecting to login')
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && profile && isPortalPage) {
    // Admin role has access to all portals
    if (profile.role === 'admin') {
      return response
    }

    if (isInstructorPage && profile.role !== 'instructor') {
      const url = request.nextUrl.clone()
      url.pathname = '/dancer'
      return NextResponse.redirect(url)
    }

    if (isDancerPage && profile.role !== 'dancer') {
      const url = request.nextUrl.clone()
      url.pathname = '/instructor'
      return NextResponse.redirect(url)
    }
  }

  if (user && isAuthPage && profile) {
    const url = request.nextUrl.clone()
    if (profile.role === 'instructor' || profile.role === 'admin') {
      url.pathname = '/instructor'
    } else {
      url.pathname = '/dancer'
    }
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
