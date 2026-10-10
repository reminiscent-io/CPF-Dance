import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { buildSignupRef } from '@/lib/signup-link'

const mockConstructEvent = vi.fn()
const mockRetrieveLink = vi.fn()
const mockEnrollStudent = vi.fn()
let rows: Record<string, unknown> = {}

vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: (...args: unknown[]) => mockConstructEvent(...args) }
    paymentLinks = { retrieve: (...args: unknown[]) => mockRetrieveLink(...args) }
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'insert']) chain[method] = () => chain
      chain.single = () => Promise.resolve({ data: rows[table] ?? null, error: null })
      return chain
    },
  }),
}))

vi.mock('@/lib/class-enrollment', () => ({
  enrollStudent: (...args: unknown[]) => mockEnrollStudent(...args),
}))

import { POST } from '../stripe/webhook/route'

const classId = '11111111-1111-4111-8111-111111111111'
const studentId = '22222222-2222-4222-8222-222222222222'

const deliver = (session: Record<string, unknown>, type = 'checkout.session.completed') => {
  mockConstructEvent.mockReturnValue({ type, data: { object: { id: 'cs_1', payment_status: 'paid', ...session } } })
  return POST(new NextRequest('http://localhost:5000/api/stripe/webhook', {
    method: 'POST',
    body: '{}',
    headers: { 'stripe-signature': 'sig' },
  }))
}

describe('POST /api/stripe/webhook class sign-ups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rows = {
      classes: { id: classId, external_signup_url: 'https://buy.stripe.com/day', workshop_signup_url: 'https://buy.stripe.com/full' },
      students: { id: studentId },
    }
    mockRetrieveLink.mockResolvedValue({ url: 'https://buy.stripe.com/full' })
    mockEnrollStudent.mockResolvedValue({ ok: true, enrollment: null, enrolled_days: 3 })
  })

  it('enrolls the dancer when the class link is paid', async () => {
    const response = await deliver({
      client_reference_id: buildSignupRef({ classId, studentId, option: 'full' }),
      payment_link: 'plink_1',
    })

    expect(response.status).toBe(200)
    expect(mockEnrollStudent).toHaveBeenCalledWith(expect.anything(), expect.anything(), studentId, classId, 'full')
  })

  it('skips a sale on a different link than the ref claims', async () => {
    mockRetrieveLink.mockResolvedValue({ url: 'https://buy.stripe.com/day' })

    const response = await deliver({
      client_reference_id: buildSignupRef({ classId, studentId, option: 'full' }),
      payment_link: 'plink_1',
    })

    expect(response.status).toBe(200)
    expect(mockEnrollStudent).not.toHaveBeenCalled()
  })

  it('waits for a delayed payment to settle', async () => {
    const response = await deliver({
      client_reference_id: buildSignupRef({ classId, studentId, option: 'full' }),
      payment_link: 'plink_1',
      payment_status: 'unpaid',
    })

    expect(response.status).toBe(200)
    expect(mockEnrollStudent).not.toHaveBeenCalled()
  })

  it('acknowledges a dancer who already confirmed by hand', async () => {
    mockEnrollStudent.mockResolvedValue({ ok: false, status: 400, error: 'already', already_enrolled: true })

    const response = await deliver({
      client_reference_id: buildSignupRef({ classId, studentId, option: 'full' }),
      payment_link: 'plink_1',
    })

    expect(response.status).toBe(200)
  })

  it('asks Stripe to retry on a database error', async () => {
    mockEnrollStudent.mockResolvedValue({ ok: false, status: 500, error: 'Failed to enroll in class' })

    const response = await deliver({
      client_reference_id: buildSignupRef({ classId, studentId, option: 'full' }),
      payment_link: 'plink_1',
    })

    expect(response.status).toBe(500)
  })

  it('acknowledges sessions that are neither class sign-ups nor lesson packs', async () => {
    const response = await deliver({ client_reference_id: null, metadata: {} })

    expect(response.status).toBe(200)
    expect(mockEnrollStudent).not.toHaveBeenCalled()
  })
})
