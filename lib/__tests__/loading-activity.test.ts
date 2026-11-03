import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// The store is module state, so each test gets a fresh copy.
async function loadStore() {
  vi.resetModules()
  return import('@/lib/loading-activity')
}

describe('navigation tracking', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/instructor/classes?view=week')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('marks the target pathname as pending until the navigation ends', async () => {
    const store = await loadStore()

    store.beginNavigation('/instructor/notes?create=true')
    expect(store.getLoadingActivity().pendingPathname).toBe('/instructor/notes')
    expect(store.getLoadingActivity().navigationStartedAt).toEqual(expect.any(Number))

    store.endNavigation()
    expect(store.getLoadingActivity().pendingPathname).toBeNull()
    expect(store.getLoadingActivity().navigationStartedAt).toBeNull()
  })

  it('treats a query-only change as a navigation', async () => {
    const store = await loadStore()
    store.beginNavigation('/instructor/classes?view=month')
    expect(store.getLoadingActivity().pendingPathname).toBe('/instructor/classes')
  })

  it('ignores the current URL, hash-only links and other origins', async () => {
    const store = await loadStore()

    store.beginNavigation('/instructor/classes?view=week')
    store.beginNavigation('/instructor/classes?view=week#roster')
    store.beginNavigation('https://buy.stripe.com/abc')

    expect(store.getLoadingActivity().pendingPathname).toBeNull()
  })

  it('gives up on a navigation that never lands', async () => {
    vi.useFakeTimers()
    const store = await loadStore()

    store.beginNavigation('/instructor/students')
    vi.advanceTimersByTime(store.NAVIGATION_TIMEOUT_MS - 1)
    expect(store.getLoadingActivity().pendingPathname).toBe('/instructor/students')

    vi.advanceTimersByTime(1)
    expect(store.getLoadingActivity().pendingPathname).toBeNull()
  })
})

describe('trackApiRequests', () => {
  const originalFetch = window.fetch

  afterEach(() => {
    window.fetch = originalFetch
  })

  function deferredFetch() {
    const pending: { resolve: (r: Response) => void; reject: (e: unknown) => void }[] = []
    const fake = vi.fn(
      () =>
        new Promise<Response>((resolve, reject) => {
          pending.push({ resolve, reject })
        })
    )
    return { fake, pending }
  }

  it('counts same-origin /api requests while they are in flight', async () => {
    const { fake, pending } = deferredFetch()
    window.fetch = fake as unknown as typeof fetch
    const store = await loadStore()
    store.trackApiRequests()

    const first = window.fetch('/api/students')
    const second = window.fetch(new URL('/api/classes', window.location.href))
    expect(store.getLoadingActivity().requests).toBe(2)

    pending[0].resolve(new Response('{}'))
    await first
    expect(store.getLoadingActivity().requests).toBe(1)

    pending[1].reject(new TypeError('Failed to fetch'))
    await expect(second).rejects.toThrow('Failed to fetch')
    expect(store.getLoadingActivity().requests).toBe(0)
  })

  it('passes other requests through uncounted', async () => {
    const { fake } = deferredFetch()
    window.fetch = fake as unknown as typeof fetch
    const store = await loadStore()
    store.trackApiRequests()

    void window.fetch('https://example.supabase.co/rest/v1/notes')
    void window.fetch('/instructor/classes')

    expect(fake).toHaveBeenCalledTimes(2)
    expect(store.getLoadingActivity().requests).toBe(0)
  })

  it('wraps fetch only once', async () => {
    const { fake } = deferredFetch()
    window.fetch = fake as unknown as typeof fetch
    const store = await loadStore()

    store.trackApiRequests()
    const wrapped = window.fetch
    store.trackApiRequests()

    expect(window.fetch).toBe(wrapped)
    void window.fetch('/api/students')
    expect(store.getLoadingActivity().requests).toBe(1)
  })
})
