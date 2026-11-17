import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ENV = {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  GOOGLE_REFRESH_TOKEN: 'refresh-token',
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// The token cache lives in module scope, so each test imports a fresh copy.
async function loadGoogleFetch() {
  vi.resetModules()
  return (await import('@/lib/google/api')).googleFetch
}

describe('googleFetch', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    for (const [key, value] of Object.entries(ENV)) vi.stubEnv(key, value)
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('trades the refresh token for an access token and calls googleapis.com with it', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: 'at-1', expires_in: 3600 }))
      .mockResolvedValueOnce(json(200, { emailAddress: 'x' }))
    const googleFetch = await loadGoogleFetch()

    const response = await googleFetch('/gmail/v1/users/me/profile', { method: 'GET' })

    expect(response.status).toBe(200)
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]
    expect(tokenUrl).toBe(TOKEN_URL)
    const form = new URLSearchParams(tokenInit.body)
    expect(form.get('grant_type')).toBe('refresh_token')
    expect(form.get('refresh_token')).toBe('refresh-token')
    expect(form.get('client_id')).toBe('client-id')

    const [apiUrl, apiInit] = fetchMock.mock.calls[1]
    expect(apiUrl).toBe('https://www.googleapis.com/gmail/v1/users/me/profile')
    expect(new Headers(apiInit.headers).get('Authorization')).toBe('Bearer at-1')
  })

  it('keeps caller headers alongside the Authorization header', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: 'at-1', expires_in: 3600 }))
      .mockResolvedValueOnce(json(200, {}))
    const googleFetch = await loadGoogleFetch()

    await googleFetch('/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })

    const headers = new Headers(fetchMock.mock.calls[1][1].headers)
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Authorization')).toBe('Bearer at-1')
  })

  it('reuses a cached token until it nears expiry', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: 'at-1', expires_in: 3600 }))
      .mockImplementation(async () => json(200, {}))
    const googleFetch = await loadGoogleFetch()

    await googleFetch('/gmail/v1/a')
    await googleFetch('/gmail/v1/b')

    expect(fetchMock.mock.calls.filter(([url]) => url === TOKEN_URL)).toHaveLength(1)
  })

  it('shares one refresh between concurrent callers', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === TOKEN_URL ? json(200, { access_token: 'at-1', expires_in: 3600 }) : json(200, {})
    )
    const googleFetch = await loadGoogleFetch()

    await Promise.all([googleFetch('/gmail/v1/a'), googleFetch('/gmail/v1/b'), googleFetch('/gmail/v1/c')])

    expect(fetchMock.mock.calls.filter(([url]) => url === TOKEN_URL)).toHaveLength(1)
  })

  it('refreshes and retries once when Google rejects the access token', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: 'stale', expires_in: 3600 }))
      .mockResolvedValueOnce(json(401, { error: { message: 'Invalid Credentials' } }))
      .mockResolvedValueOnce(json(200, { access_token: 'fresh', expires_in: 3600 }))
      .mockResolvedValueOnce(json(200, { ok: true }))
    const googleFetch = await loadGoogleFetch()

    const response = await googleFetch('/calendar/v3/calendars/primary')

    expect(response.status).toBe(200)
    expect(new Headers(fetchMock.mock.calls[3][1].headers).get('Authorization')).toBe('Bearer fresh')
  })

  it('surfaces the OAuth error when the refresh token is rejected', async () => {
    fetchMock.mockResolvedValueOnce(json(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }))
    const googleFetch = await loadGoogleFetch()

    await expect(googleFetch('/gmail/v1/users/me/profile')).rejects.toThrow(
      'Google OAuth error: Token has been expired or revoked.'
    )
  })

  it('names the missing env var instead of calling Google', async () => {
    vi.stubEnv('GOOGLE_REFRESH_TOKEN', '')
    const googleFetch = await loadGoogleFetch()

    await expect(googleFetch('/gmail/v1/users/me/profile')).rejects.toThrow('GOOGLE_REFRESH_TOKEN is not set')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a path without a leading slash', async () => {
    const googleFetch = await loadGoogleFetch()

    await expect(googleFetch('gmail/v1/users/me/profile')).rejects.toThrow('must start with "/"')
  })

  it.each([
    // An ID carrying dot segments, raw and percent-encoded, walking out of Gmail.
    '/gmail/v1/users/me/threads/../../../../oauth2/v2/userinfo',
    '/gmail/v1/users/me/threads/%2e%2e/%2E%2E/%2e%2e/%2e%2e/drive/v3/files',
    // Another Google API entirely.
    '/drive/v3/files',
    // Protocol-relative: must not become a different host.
    '//evil.example/gmail/v1/x',
  ])('refuses %s before any request goes out', async (path) => {
    const googleFetch = await loadGoogleFetch()

    await expect(googleFetch(path)).rejects.toThrow('only calls the Gmail and Calendar APIs')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('googleId', () => {
  it('accepts Gmail and Calendar IDs', async () => {
    const { googleId } = await import('@/lib/google/api')
    expect(googleId('18c2f4a9b0e1d3c7')).toBe('18c2f4a9b0e1d3c7')
    expect(googleId('a1b2c3d4e5f6g7h8i9j0_20261118T170000Z')).toBe('a1b2c3d4e5f6g7h8i9j0_20261118T170000Z')
  })

  it.each(['', '..', '../../calendar/v3/calendars/primary/events', 'abc?format=raw', 'abc/def', 'a%2fb'])(
    'rejects %j',
    async (value) => {
      const { googleId } = await import('@/lib/google/api')
      expect(() => googleId(value, 'thread ID')).toThrow('Not a valid Google thread ID')
    }
  )
})
