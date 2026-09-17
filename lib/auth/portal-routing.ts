/**
 * Role-based routing for the portal proxy.
 *
 * Kept free of Next.js request objects so the redirect rules can be unit
 * tested. Access decisions come from ./privileges, the same helpers the
 * client-side portal pages use.
 *
 * Invariant: a redirect target is always a page the same role may stay on, so
 * following any redirect settles in one hop.
 */

import { canAccessDancerPortal, canAccessInstructorPortal, hasAdminPrivileges } from './privileges'

type Portal = 'admin' | 'instructor' | 'dancer'

const LOGIN_PATH = '/login'
const AUTH_PATHS = [LOGIN_PATH, '/signup']
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

export interface PortalRequest {
  pathname: string
  isAuthenticated: boolean
  /** The signed-in user's profile, or null if it couldn't be loaded. */
  profile: { role?: unknown } | null
}

/** Returns the path to redirect to, or null to let the request through. */
export function resolvePortalRedirect({ pathname, isAuthenticated, profile }: PortalRequest): string | null {
  const portal = getPortal(pathname)

  if (!isAuthenticated) {
    return portal ? LOGIN_PATH : null
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

  if (AUTH_PATHS.some((authPath) => isUnder(pathname, authPath))) {
    return home
  }

  return null
}
