import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { response, user, profile } = await updateSession(request)

  const isAuthPage = request.nextUrl.pathname.startsWith('/portal/login') ||
                     request.nextUrl.pathname.startsWith('/portal/signup')
  const isInstructorPage = request.nextUrl.pathname.startsWith('/portal/instructor')
  const isDancerPage = request.nextUrl.pathname.startsWith('/portal/dancer')
  const isStudioPage = request.nextUrl.pathname.startsWith('/portal/studio')
  const isPortalPage = isInstructorPage || isDancerPage || isStudioPage

  if (isPortalPage) {
    const cookies = request.cookies.getAll()
    const supabaseCookies = cookies.filter(c => c.name.includes('supabase'))
    console.log('Middleware check:', {
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
    url.pathname = '/portal/login'
    return NextResponse.redirect(url)
  }

  if (user && profile && isPortalPage) {
    // Admin role has access to all portals
    if (profile.role === 'admin') {
      return response
    }

    if (isInstructorPage && profile.role !== 'instructor') {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'dancer' ? '/portal/dancer' : '/portal/studio'
      return NextResponse.redirect(url)
    }

    if (isDancerPage && profile.role !== 'dancer') {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'instructor' ? '/portal/instructor' : '/portal/studio'
      return NextResponse.redirect(url)
    }

    if (isStudioPage && profile.role !== 'studio') {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'instructor' ? '/portal/instructor' : '/portal/dancer'
      return NextResponse.redirect(url)
    }
  }

  if (user && isAuthPage && profile) {
    const url = request.nextUrl.clone()
    if (profile.role === 'instructor') {
      url.pathname = '/instructor'
    } else if (profile.role === 'studio') {
      url.pathname = '/studio'
    } else if (profile.role === 'admin') {
      url.pathname = '/instructor' // Default admin landing page
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
