import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { resolvePortalRedirect } from '@/lib/auth/portal-routing'

export default async function proxy(request: NextRequest) {
  const { response, user, profile } = await updateSession(request)

  // Role rules live in lib/auth/portal-routing.ts
  const redirectPath = resolvePortalRedirect({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    isAuthenticated: !!user,
    profile,
  })

  if (redirectPath) {
    // The target carries its own query (`/login?next=...`), so it replaces the
    // request's rather than inheriting it.
    return NextResponse.redirect(new URL(redirectPath, request.nextUrl.origin))
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
