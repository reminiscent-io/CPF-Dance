import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Auth bypass for development - allow all portal access
  return NextResponse.next()
  
  /* Auth disabled
  const { response, user, profile } = await updateSession(request)

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                     request.nextUrl.pathname.startsWith('/signup')
  const isInstructorPage = request.nextUrl.pathname.startsWith('/instructor')
  const isDancerPage = request.nextUrl.pathname.startsWith('/dancer')
  const isStudioPage = request.nextUrl.pathname.startsWith('/studio')
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
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && profile && isPortalPage) {
    if (isInstructorPage && profile.role !== 'instructor') {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'dancer' ? '/dancer' : '/studio'
      return NextResponse.redirect(url)
    }
    
    if (isDancerPage && profile.role !== 'dancer') {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'instructor' ? '/instructor' : '/studio'
      return NextResponse.redirect(url)
    }
    
    if (isStudioPage && profile.role !== 'studio_admin') {
      const url = request.nextUrl.clone()
      url.pathname = profile.role === 'instructor' ? '/instructor' : '/dancer'
      return NextResponse.redirect(url)
    }
  }

  if (user && isAuthPage && profile) {
    const url = request.nextUrl.clone()
    if (profile.role === 'instructor') {
      url.pathname = '/instructor'
    } else if (profile.role === 'studio_admin') {
      url.pathname = '/studio'
    } else {
      url.pathname = '/dancer'
    }
    return NextResponse.redirect(url)
  }

  return response
  */
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
