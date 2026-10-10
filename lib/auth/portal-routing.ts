/**
 * Role-based routing for the portal proxy.
 *
 * Kept free of Next.js request objects so the redirect rules can be unit
 * tested. Access decisions come from ./privileges, the same helpers the
 * client-side portal pages use.
 *
 * Invariant: a redirect target is always a page the same role may stay on, so
 * following any redirect settles in one hop.
 *
 * A signed-out visitor bounced to /login carries the page they asked for in
 * `?next=`, and lands back on it after signing in. That's what makes a shared
 * class link work for someone who isn't signed in yet.
 */

import { canAccessDancerPortal, canAccessInstructorPortal, hasAdminPrivileges } from './privileges'

type Portal = 'admin' | 'instructor' | 'dancer'

const LOGIN_PATH = '/login'
const AUTH_PATHS = [LOGIN_PATH, '/signup']

/** Query param that carries the post-auth return path through login and signup. */
export const NEXT_PARAM = 'next'

// Only used to parse relative paths; never fetched.
const PARSE_ORIGIN = 'https://cpfdance.invalid'

const PORTAL_PATHS: Record<Portal, string> = {
  admin: '/admin',
  instructor: '/instructor',
  dancer: '/dancer',
}

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function getPortal(pathname: string): Portal | null {
  const match = (Object.keys(PORTAL_PATHS) as Portal[]).find((portal) =>
    isUnder(pathname, PORTAL_PATHS[portal])
  )
  return match ?? null
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((authPath) => isUnder(pathname, authPath))
}

function canAccessPortal(role: string | null, portal: Portal): boolean {
  const profile = role === null ? null : { role }
  switch (portal) {
    case 'admin':
      return hasAdminPrivileges(profile)
    case 'instructor':
      return canAccessInstructorPortal(profile)
    case 'dancer':
      return canAccessDancerPortal(profile)
  }
}

/** Where a role lands after login, or null for roles with no portal. */
export function getHomePathForRole(role: unknown): string | null {
  switch (role) {
    case 'admin':
    case 'instructor':
      return PORTAL_PATHS.instructor
    // Guardians use the dancer portal on behalf of their linked student.
    case 'dancer':
    case 'guardian':
      return PORTAL_PATHS.dancer
    default:
      return null
  }
}

/**
 * Returns `value` as a same-site path, or null. A full URL, a protocol-relative
 * `//host` or a backslash variant would turn the login form into an open
 * redirect, and an auth page would loop, so those are all refused.
 */
export function getSafeNextPath(value: unknown): string | null {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return null
  }
  let url: URL
  try {
    url = new URL(value, PARSE_ORIGIN)
  } catch {
    return null
  }
  // The URL parser drops tabs and newlines, so `/\t/evil.com` resolves off-site.
  if (url.origin !== PARSE_ORIGIN || isAuthPath(url.pathname)) {
    return null
  }
  return `${url.pathname}${url.search}${url.hash}`
}

/**
 * Where a just-authenticated user goes: the requested `next` path when their
 * role may open it, otherwise their portal home. Null for roles with no portal.
 */
export function getPostAuthPath(role: unknown, next: unknown): string | null {
  const home = getHomePathForRole(role)
  if (home === null) return null

  const safeNext = getSafeNextPath(next)
  if (safeNext === null) return home

  const portal = getPortal(new URL(safeNext, PARSE_ORIGIN).pathname)
  if (portal && !canAccessPortal(typeof role === 'string' ? role : null, portal)) {
    return home
  }
  return safeNext
}

/** `/login?next=<path>`, for sending a signed-out visitor to sign in and back. */
export function getLoginPathFor(returnTo: string): string {
  return `${LOGIN_PATH}?${NEXT_PARAM}=${encodeURIComponent(returnTo)}`
}

export interface PortalRequest {
  pathname: string
  /** The raw query string, `?` included, or empty. */
  search?: string
  isAuthenticated: boolean
  /** The signed-in user's profile, or null if it couldn't be loaded. */
  profile: { role?: unknown } | null
}

/** Returns the path to redirect to, or null to let the request through. */
export function resolvePortalRedirect({ pathname, search = '', isAuthenticated, profile }: PortalRequest): string | null {
  const portal = getPortal(pathname)

  if (!isAuthenticated) {
    return portal ? getLoginPathFor(`${pathname}${search}`) : null
  }

  // Without a profile there's no role to route on; the pages' own guards decide.
  if (!profile) {
    return null
  }

  const role = typeof profile.role === 'string' ? profile.role : null
  const home = getHomePathForRole(role)

  if (portal) {
    if (canAccessPortal(role, portal)) {
      return null
    }
    // A role with no portal goes to login. Sending it to another portal would
    // bounce it straight back.
    return home ?? LOGIN_PATH
  }

  if (isAuthPath(pathname)) {
    // Already signed in: skip the form and go where the link was headed.
    return getPostAuthPath(role, new URLSearchParams(search).get(NEXT_PARAM))
  }

  return null
}
