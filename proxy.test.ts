import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockUpdateSession = vi.fn()

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (request: NextRequest) => mockUpdateSession(request),
}))

import proxy from './proxy'

const ORIGIN = 'http://localhost:3434'

function signInAs(role: unknown) {
  mockUpdateSession.mockImplementation(async () => ({
    response: NextResponse.next(),
    user: { id: 'user-1' },
    profile: { id: 'user-1', role },
  }))
}

// Follows proxy redirects the way a browser would, returning every path visited.
async function follow(pathname: string, maxHops = 5): Promise<string[]> {
  const visited = [pathname]
  let url = new URL(pathname, ORIGIN)
  for (let hop = 0; hop < maxHops; hop++) {
    const response = await proxy(new NextRequest(url))
    const location = response.headers.get('location')
    if (!location) return visited
    url = new URL(location, ORIGIN)
    visited.push(url.pathname)
  }
  throw new Error(`Redirect loop: ${visited.join(' -> ')}`)
}

describe('proxy role routing', () => {
  beforeEach(() => {
    mockUpdateSession.mockReset()
  })

  it('passes the session response through when no redirect applies', async () => {
    const sessionResponse = NextResponse.next()
    mockUpdateSession.mockResolvedValue({
      response: sessionResponse,
      user: { id: 'user-1' },
      profile: { id: 'user-1', role: 'guardian' },
    })

    const response = await proxy(new NextRequest(`${ORIGIN}/dancer`))

    expect(response).toBe(sessionResponse)
  })

  it('lets a guardian into the dancer portal', async () => {
    signInAs('guardian')
    expect(await follow('/dancer/schedule')).toEqual(['/dancer/schedule'])
  })

  it('sends a guardian from the instructor portal to the dancer portal without looping', async () => {
    signInAs('guardian')
    expect(await follow('/instructor')).toEqual(['/instructor', '/dancer'])
  })

  it('sends a guardian from /login to the dancer portal', async () => {
    signInAs('guardian')
    expect(await follow('/login')).toEqual(['/login', '/dancer'])
  })

  it('sends a guardian away from the admin portal', async () => {
    signInAs('guardian')
    expect(await follow('/admin/users')).toEqual(['/admin/users', '/dancer'])
  })

  it('keeps the query string on redirect', async () => {
    signInAs('guardian')
    const response = await proxy(new NextRequest(`${ORIGIN}/login?next=%2Fdancer%2Fnotes`))
    expect(response.headers.get('location')).toBe(`${ORIGIN}/dancer?next=%2Fdancer%2Fnotes`)
  })

  it('sends an unrecognized role to /login and leaves it there', async () => {
    signInAs('studio')
    expect(await follow('/dancer')).toEqual(['/dancer', '/login'])
    expect(await follow('/instructor')).toEqual(['/instructor', '/login'])
    expect(await follow('/admin')).toEqual(['/admin', '/login'])
  })

  it('sends signed-out visitors to /login', async () => {
    mockUpdateSession.mockResolvedValue({ response: NextResponse.next(), user: null, profile: null })
    expect(await follow('/instructor/classes')).toEqual(['/instructor/classes', '/login'])
  })

  it.each(['admin', 'instructor', 'dancer', 'guardian', 'studio', undefined])(
    'never loops for role %j',
    async (role) => {
      signInAs(role)
      for (const path of ['/admin', '/instructor', '/dancer', '/login', '/signup', '/']) {
        const visited = await follow(path)
        expect(visited.length, visited.join(' -> ')).toBeLessThanOrEqual(2)
      }
    }
  )
})
