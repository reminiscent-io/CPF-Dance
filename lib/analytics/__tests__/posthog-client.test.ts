import { beforeEach, describe, expect, it, vi } from 'vitest'

// A stand-in for the posthog-js singleton that keeps consent and identity
// state, so the tests can check what each call leaves behind.
const ph = vi.hoisted(() => {
  const state = { optedIn: false, optedOut: false, identified: false, distinctId: 'anon-1' }
  const api = {
    __loaded: true,
    state,
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn((id: string) => {
      state.identified = true
      state.distinctId = id
    }),
    reset: vi.fn(() => {
      // Real reset() also drops consent.
      state.identified = false
      state.distinctId = 'anon-2'
      state.optedIn = false
    }),
    opt_in_capturing: vi.fn(() => {
      state.optedIn = true
      state.optedOut = false
    }),
    opt_out_capturing: vi.fn(() => {
      state.optedOut = true
      state.optedIn = false
    }),
    has_opted_in_capturing: vi.fn(() => state.optedIn),
    has_opted_out_capturing: vi.fn(() => state.optedOut),
    get_distinct_id: vi.fn(() => state.distinctId),
    get_property: vi.fn((key: string) =>
      key === '$user_state' ? (state.identified ? 'identified' : 'anonymous') : undefined,
    ),
    stopSessionRecording: vi.fn(),
  }
  return api
})

vi.mock('posthog-js', () => ({ default: ph }))

import {
  grantAnalyticsConsent,
  initPostHog,
  isStaffPath,
  revokeAnalyticsConsent,
  syncAnalyticsUser,
  syncReplayForPath,
} from '../posthog-client'

beforeEach(() => {
  vi.clearAllMocks()
  ph.__loaded = true
  Object.assign(ph.state, { optedIn: false, optedOut: false, identified: false, distinctId: 'anon-1' })
})

describe('initPostHog', () => {
  it('does nothing without a token', () => {
    initPostHog(undefined)
    expect(ph.init).not.toHaveBeenCalled()
  })

  it('starts opted out, behind the proxy, with inputs masked', () => {
    initPostHog('phc_test')
    const config = ph.init.mock.calls[0][1]
    expect(config).toMatchObject({
      api_host: '/ingest',
      opt_out_capturing_by_default: true,
      opt_out_persistence_by_default: true,
      session_recording: { maskAllInputs: true },
    })
  })
})

describe('consent', () => {
  it('opts in once, however often the banner re-applies consent', () => {
    grantAnalyticsConsent()
    grantAnalyticsConsent()
    expect(ph.opt_in_capturing).toHaveBeenCalledTimes(1)
  })

  it('opts out when the visitor picks necessary only', () => {
    ph.state.optedIn = true
    revokeAnalyticsConsent()
    expect(ph.opt_out_capturing).toHaveBeenCalled()
  })

  it('waits for PostHog to load', () => {
    ph.__loaded = false
    grantAnalyticsConsent()
    expect(ph.opt_in_capturing).not.toHaveBeenCalled()
  })
})

describe('syncAnalyticsUser', () => {
  it('sends the user ID and role and nothing else', () => {
    syncAnalyticsUser({ id: 'user-1', role: 'dancer' })
    expect(ph.identify).toHaveBeenCalledWith('user-1', { role: 'dancer' })
  })

  it('does not identify the same user twice', () => {
    syncAnalyticsUser({ id: 'user-1', role: 'dancer' })
    syncAnalyticsUser({ id: 'user-1', role: 'dancer' })
    expect(ph.identify).toHaveBeenCalledTimes(1)
  })

  it('resets between two users and keeps consent', () => {
    ph.state.optedIn = true
    syncAnalyticsUser({ id: 'user-1', role: 'dancer' })
    syncAnalyticsUser({ id: 'user-2', role: 'dancer' })
    expect(ph.reset).toHaveBeenCalledTimes(1)
    expect(ph.state.optedIn).toBe(true)
    expect(ph.state.distinctId).toBe('user-2')
  })

  it('forgets the user on sign-out and keeps consent', () => {
    ph.state.optedIn = true
    syncAnalyticsUser({ id: 'user-1', role: 'dancer' })
    syncAnalyticsUser(null)
    expect(ph.reset).toHaveBeenCalledTimes(1)
    expect(ph.state.optedIn).toBe(true)
    expect(ph.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false })
  })

  it('does not reset an anonymous visitor', () => {
    syncAnalyticsUser(null)
    expect(ph.reset).not.toHaveBeenCalled()
  })

  it.each(['instructor', 'admin'] as const)('stops replay for an %s', (role) => {
    syncAnalyticsUser({ id: 'staff-1', role })
    expect(ph.stopSessionRecording).toHaveBeenCalled()
  })

  it('keeps replay on for a dancer', () => {
    syncAnalyticsUser({ id: 'user-1', role: 'dancer' })
    expect(ph.stopSessionRecording).not.toHaveBeenCalled()
  })
})

describe('staff paths', () => {
  it('matches the instructor and admin portals only', () => {
    expect(isStaffPath('/instructor')).toBe(true)
    expect(isStaffPath('/admin/users')).toBe(true)
    expect(isStaffPath('/dancer/notes')).toBe(false)
    expect(isStaffPath('/instructors-wanted')).toBe(false)
  })

  it('stops replay on navigation into a staff page', () => {
    syncReplayForPath('/instructor/students?tab=all')
    expect(ph.stopSessionRecording).toHaveBeenCalled()
  })

  it('leaves replay alone on dancer pages', () => {
    syncReplayForPath('/dancer/classes')
    expect(ph.stopSessionRecording).not.toHaveBeenCalled()
  })
})
