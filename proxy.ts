import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { resolvePortalRedirect } from '@/lib/auth/portal-routing'

export default async function proxy(request: NextRequest) {
  const { response, user, profile } = await updateSession(request)

  // Role rules live in lib/auth/portal-routing.ts
  const redirectPath = resolvePortalRedirect({
    pathname: request.nextUrl.pathname,
    isAuthenticated: !!user,
    profile,
  })

  if (redirectPath) {
    const url = request.nextUrl.clone()
    url.pathname = redirectPath
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
