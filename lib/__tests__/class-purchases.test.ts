import { describe, it, expect } from 'vitest'
import { matchPaidLink, type LinkedClass } from '@/lib/class-purchases'

const day = (id: string, start: string, overrides: Partial<LinkedClass> = {}): LinkedClass => ({
  id,
  start_time: start,
  class_type: 'workshop',
  series_id: 'nov',
  workshop_full_only: false,
  external_signup_url: 'https://book.stripe.com/day',
  workshop_signup_url: 'https://book.stripe.com/full',
  ...overrides,
})

describe('matchPaidLink', () => {
  const workshop = [day('sun', '2026-11-15T15:30:00Z'), day('sat', '2026-11-14T15:30:00Z')]

  it('puts a full-workshop sale on the first day', () => {
    expect(matchPaidLink(workshop, 'https://book.stripe.com/full')).toEqual({ classId: 'sat', option: 'full', ambiguous: false })
  })

  it('matches the link Stripe reports on another of its hosts', () => {
    expect(matchPaidLink(workshop, 'https://buy.stripe.com/full')?.classId).toBe('sat')
  })

  it('flags a day link shared by several days as ambiguous', () => {
    expect(matchPaidLink(workshop, 'https://book.stripe.com/day')).toEqual({ classId: 'sat', option: 'day', ambiguous: true })
  })

  it('reads a workshop with one link as selling the full run', () => {
    const oneLink = workshop.map(cls => ({ ...cls, workshop_signup_url: null }))
    expect(matchPaidLink(oneLink, 'https://book.stripe.com/day')).toEqual({ classId: 'sat', option: 'full', ambiguous: false })
  })

  it('matches a plain class by its own link', () => {
    const cls = day('solo', '2026-12-01T15:00:00Z', { class_type: 'master_class', series_id: null, workshop_signup_url: null })
    expect(matchPaidLink([cls], 'https://book.stripe.com/day')).toEqual({ classId: 'solo', option: undefined, ambiguous: false })
  })

  it('returns null for a link no class sells', () => {
    expect(matchPaidLink(workshop, 'https://book.stripe.com/other')).toBeNull()
  })
})
