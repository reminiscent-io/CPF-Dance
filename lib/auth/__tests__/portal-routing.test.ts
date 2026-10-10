import { describe, it, expect } from 'vitest'
import { resolvePortalRedirect, getHomePathForRole, getSafeNextPath, getPostAuthPath } from '../portal-routing'

const signedIn = (pathname: string, role: unknown, search = '') =>
  resolvePortalRedirect({ pathname, search, isAuthenticated: true, profile: { role } })

const PORTAL_PATHS = ['/admin', '/admin/users', '/instructor', '/instructor/classes', '/dancer', '/dancer/schedule']
const AUTH_PATHS = ['/login', '/signup']
const PUBLIC_PATHS = ['/', '/privacy-policy', '/terms-of-service']

describe('resolvePortalRedirect', () => {
  describe('signed out', () => {
    it.each(PORTAL_PATHS)('sends %s to /login with the path to come back to', (pathname) => {
      expect(resolvePortalRedirect({ pathname, isAuthenticated: false, profile: null })).toBe(
        `/login?next=${encodeURIComponent(pathname)}`
      )
    })

    it('keeps the query string of a deep link', () => {
      expect(
        resolvePortalRedirect({
          pathname: '/dancer/available-classes',
          search: '?class=abc',
          isAuthenticated: false,
          profile: null,
        })
      ).toBe('/login?next=%2Fdancer%2Favailable-classes%3Fclass%3Dabc')
    })

    it.each([...AUTH_PATHS, ...PUBLIC_PATHS])('leaves %s alone', (pathname) => {
      expect(resolvePortalRedirect({ pathname, isAuthenticated: false, profile: null })).toBeNull()
    })
  })

  describe('guardian', () => {
    it.each(['/dancer', '/dancer/schedule', '/dancer/waivers/abc/sign'])('can use %s', (pathname) => {
      expect(signedIn(pathname, 'guardian')).toBeNull()
    })

    it.each(['/instructor', '/instructor/classes', '/admin', '/admin/users'])('is sent from %s to /dancer', (pathname) => {
      expect(signedIn(pathname, 'guardian')).toBe('/dancer')
    })

    it.each(AUTH_PATHS)('is sent from %s to /dancer', (pathname) => {
      expect(signedIn(pathname, 'guardian')).toBe('/dancer')
    })
  })

  describe('dancer', () => {
    it('can use /dancer', () => {
      expect(signedIn('/dancer/notes', 'dancer')).toBeNull()
    })

    it.each(['/instructor', '/admin', '/login'])('is sent from %s to /dancer', (pathname) => {
      expect(signedIn(pathname, 'dancer')).toBe('/dancer')
    })
  })

  describe('instructor', () => {
    it('can use /instructor', () => {
      expect(signedIn('/instructor/students', 'instructor')).toBeNull()
    })

    it.each(['/dancer', '/admin', '/signup'])('is sent from %s to /instructor', (pathname) => {
      expect(signedIn(pathname, 'instructor')).toBe('/instructor')
    })
  })

  describe('admin', () => {
    it.each(PORTAL_PATHS)('can use %s', (pathname) => {
      expect(signedIn(pathname, 'admin')).toBeNull()
    })

    it('is sent from /login to /instructor', () => {
      expect(signedIn('/login', 'admin')).toBe('/instructor')
    })
  })

  describe('unrecognized role', () => {
    it.each(['studio', '', 'Dancer', 42])('sends role %j from a portal to /login', (role) => {
      expect(signedIn('/dancer', role)).toBe('/login')
      expect(signedIn('/instructor', role)).toBe('/login')
      expect(signedIn('/admin', role)).toBe('/login')
    })

    it('does not bounce off the auth pages', () => {
      expect(signedIn('/login', 'studio')).toBeNull()
      expect(signedIn('/signup', 'studio')).toBeNull()
    })

    it('treats a profile with no role as unrecognized', () => {
      expect(resolvePortalRedirect({ pathname: '/dancer', isAuthenticated: true, profile: {} })).toBe('/login')
    })
  })

  describe('signed in on an auth page with ?next=', () => {
    const next = `?next=${encodeURIComponent('/dancer/available-classes?class=abc')}`

    it('sends a dancer on to the deep link', () => {
      expect(signedIn('/login', 'dancer', next)).toBe('/dancer/available-classes?class=abc')
      expect(signedIn('/signup', 'guardian', next)).toBe('/dancer/available-classes?class=abc')
    })

    it('sends a role that cannot open the target to its home instead', () => {
      expect(signedIn('/login', 'instructor', next)).toBe('/instructor')
    })

    it('ignores an off-site next', () => {
      expect(signedIn('/login', 'dancer', '?next=https://evil.example')).toBe('/dancer')
    })
  })

  describe('signed in without a profile row', () => {
    it.each([...PORTAL_PATHS, ...AUTH_PATHS])('defers %s to the page guards', (pathname) => {
      expect(resolvePortalRedirect({ pathname, isAuthenticated: true, profile: null })).toBeNull()
    })
  })

  describe('path matching', () => {
    it.each(['/dancers', '/instructor-apply', '/administration', '/login-help', '/signups'])(
      'does not treat %s as a portal or auth page',
      (pathname) => {
        expect(resolvePortalRedirect({ pathname, isAuthenticated: false, profile: null })).toBeNull()
        expect(signedIn(pathname, 'dancer')).toBeNull()
      }
    )

    it('matches a trailing slash', () => {
      expect(signedIn('/instructor/', 'guardian')).toBe('/dancer')
    })
  })

  describe('loop safety', () => {
    const ROLES: unknown[] = ['admin', 'instructor', 'dancer', 'guardian', 'studio', '', undefined, null, 7]
    const PATHS = [...PORTAL_PATHS, ...AUTH_PATHS, ...PUBLIC_PATHS]

    for (const role of ROLES) {
      it(`settles in one hop for role ${JSON.stringify(role) ?? 'undefined'}`, () => {
        for (const pathname of PATHS) {
          const target = signedIn(pathname, role)
          if (target === null) continue
          expect(target, `${pathname} redirected to itself`).not.toBe(pathname)
          expect(signedIn(target, role), `${pathname} -> ${target} redirected again`).toBeNull()
        }
      })
    }
  })
})

describe('getSafeNextPath', () => {
  it.each(['/dancer', '/dancer/available-classes?class=abc', '/classes/abc#top', '/'])('keeps %s', (path) => {
    expect(getSafeNextPath(path)).toBe(path)
  })

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'dancer',
    '',
    '/login',
    '/signup?next=/dancer',
    null,
    42,
  ])('refuses %j', (value) => {
    expect(getSafeNextPath(value)).toBeNull()
  })
})

describe('getPostAuthPath', () => {
  it('uses next when the role may open it', () => {
    expect(getPostAuthPath('dancer', '/dancer/available-classes?class=abc')).toBe('/dancer/available-classes?class=abc')
    expect(getPostAuthPath('admin', '/dancer/available-classes')).toBe('/dancer/available-classes')
    expect(getPostAuthPath('instructor', '/classes/abc')).toBe('/classes/abc')
  })

  it('falls back to the home portal', () => {
    expect(getPostAuthPath('dancer', undefined)).toBe('/dancer')
    expect(getPostAuthPath('dancer', '/instructor/classes')).toBe('/dancer')
    expect(getPostAuthPath('instructor', '/dancer/available-classes')).toBe('/instructor')
    expect(getPostAuthPath('dancer', 'https://evil.example')).toBe('/dancer')
  })

  it('returns null for a role with no portal', () => {
    expect(getPostAuthPath('studio', '/dancer')).toBeNull()
  })
})

describe('getHomePathForRole', () => {
  it.each([
    ['admin', '/instructor'],
    ['instructor', '/instructor'],
    ['dancer', '/dancer'],
    ['guardian', '/dancer'],
    ['studio', null],
    [undefined, null],
  ])('maps %j to %j', (role, expected) => {
    expect(getHomePathForRole(role)).toBe(expected)
  })
})
