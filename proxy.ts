import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export default async function proxy(request: NextRequest) {
  const { response, user, profile } = await updateSession(request)

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup')
  const isAdminPage = request.nextUrl.pathname.startsWith('/admin')
  const isInstructorPage = request.nextUrl.pathname.startsWith('/instructor')
  const isDancerPage = request.nextUrl.pathname.startsWith('/dancer')
  const isPortalPage = isAdminPage || isInstructorPage || isDancerPage

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
    // Only admin can access admin portal
    if (isAdminPage && profile.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'instructor' ? '/instructor' : '/dancer'
      return NextResponse.redirect(url)
    }

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
    if (profile.role === 'admin') {
      url.pathname = '/admin'
    } else if (profile.role === 'instructor') {
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
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (webpack HMR)
     * - favicon and icons
     * - public images
     */
    '/((?!api/|_next/|favicon\\.ico|icon-.*\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
