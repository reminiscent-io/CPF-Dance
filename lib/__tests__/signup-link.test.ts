import { describe, it, expect } from 'vitest'
import { buildSignupRef, parseSignupRef, sameLink, signupUrlFor, withSignupRef } from '../signup-link'

const classId = '11111111-1111-4111-8111-111111111111'
const studentId = '22222222-2222-4222-8222-222222222222'

describe('signup links', () => {
  it('round-trips a signup ref', () => {
    for (const option of ['full', 'day', undefined] as const) {
      expect(parseSignupRef(buildSignupRef({ classId, studentId, option }))).toEqual({ classId, studentId, option })
    }
  })

  it('ignores refs that are not ours', () => {
    expect(parseSignupRef(null)).toBeNull()
    expect(parseSignupRef('order_123')).toBeNull()
    expect(parseSignupRef(`cpfclass_${classId}_${studentId}_both`)).toBeNull()
  })

  it('keeps refs inside what Stripe accepts', () => {
    const ref = buildSignupRef({ classId, studentId, option: 'full' })
    expect(ref.length).toBeLessThanOrEqual(200)
    expect(ref).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('tags Stripe Payment Links only', () => {
    const ref = { classId, studentId }
    const tagged = new URL(withSignupRef('https://buy.stripe.com/abc123?prefilled_promo_code=X', ref))
    expect(tagged.searchParams.get('client_reference_id')).toBe(buildSignupRef(ref))
    expect(tagged.searchParams.get('prefilled_promo_code')).toBe('X')

    const book = new URL(withSignupRef('https://book.stripe.com/fZu4gz9to5Ej', ref))
    expect(book.searchParams.get('client_reference_id')).toBe(buildSignupRef(ref))

    expect(withSignupRef('https://forms.gle/xyz', ref)).toBe('https://forms.gle/xyz')
    expect(withSignupRef('https://buy.stripe.com/abc123', null)).toBe('https://buy.stripe.com/abc123')
  })

  it('picks the full-run link for a workshop pass, falling back to the class link', () => {
    const cls = { external_signup_url: 'https://buy.stripe.com/day', workshop_signup_url: 'https://buy.stripe.com/full' }
    expect(signupUrlFor(cls, 'full')).toBe('https://buy.stripe.com/full')
    expect(signupUrlFor(cls, 'day')).toBe('https://buy.stripe.com/day')
    expect(signupUrlFor({ ...cls, workshop_signup_url: null }, 'full')).toBe('https://buy.stripe.com/day')
  })

  it('matches links regardless of query string or trailing slash', () => {
    expect(sameLink('https://buy.stripe.com/abc', 'https://buy.stripe.com/abc/?x=1')).toBe(true)
    expect(sameLink('https://buy.stripe.com/abc', 'https://buy.stripe.com/abd')).toBe(false)
    expect(sameLink('https://buy.stripe.com/abc', null)).toBe(false)
    expect(sameLink('https://book.stripe.com/abc', 'https://buy.stripe.com/abc')).toBe(true)
    expect(sameLink('https://example.com/abc', 'https://buy.stripe.com/abc')).toBe(false)
  })
})
