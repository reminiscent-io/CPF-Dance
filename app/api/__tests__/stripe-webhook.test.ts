import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { buildSignupRef } from '@/lib/signup-link'

const mockConstructEvent = vi.fn()
const mockRetrieveLink = vi.fn()
const mockEnrollStudent = vi.fn()
let rows: Record<string, unknown> = {}
// What a list query (no .single()) on each table resolves to
let lists: Record<string, unknown[]> = {}
const writes: { table: string; op: string; payload: unknown }[] = []

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
      for (const method of ['select', 'eq', 'in', 'is', 'or', 'gte', 'ilike']) chain[method] = () => chain
      for (const op of ['insert', 'upsert', 'update']) {
        chain[op] = (payload: unknown) => {
          writes.push({ table, op, payload })
          return chain
        }
      }
      chain.single = () => Promise.resolve({ data: rows[table] ?? null, error: null })
      chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: lists[table] ?? [], error: null })
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
  mockConstructEvent.mockReturnValue({ type, data: { object: { id: 'cs_1', payment_status: 'paid', created: 1792000000, ...session } } })
  return POST(new NextRequest('http://localhost:5000/api/stripe/webhook', {
    method: 'POST',
    body: '{}',
    headers: { 'stripe-signature': 'sig' },
  }))
}

describe('POST /api/stripe/webhook class sign-ups', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writes.length = 0
    const workshopDay = {
      id: classId,
      start_time: '2026-11-14T15:30:00Z',
      class_type: 'workshop',
      series_id: 'series-1',
      workshop_full_only: false,
      external_signup_url: 'https://buy.stripe.com/day',
      workshop_signup_url: 'https://buy.stripe.com/full',
    }
    rows = { classes: workshopDay, students: { id: studentId } }
    lists = { classes: [workshopDay] }
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
    expect(writes).toContainEqual(expect.objectContaining({
      table: 'class_purchases',
      op: 'upsert',
      payload: expect.objectContaining({ class_id: classId, student_id: studentId, workshop_option: 'full' }),
    }))
  })

  it('books a full class as paid, not yet linked', async () => {
    mockEnrollStudent.mockResolvedValue({ ok: false, status: 400, error: 'This class is full' })

    const response = await deliver({
      client_reference_id: buildSignupRef({ classId, studentId, option: 'full' }),
      payment_link: 'plink_1',
    })

    expect(response.status).toBe(200)
    expect(writes).toContainEqual(expect.objectContaining({
      table: 'class_purchases',
      payload: expect.objectContaining({ student_id: null }),
    }))
  })

  it('does not enroll on a different link than the ref claims', async () => {
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

  it('enrolls a buyer from the raw link when their email names one dancer', async () => {
    lists.profiles = [{ id: 'profile-1' }]
    lists.students = [{ id: studentId }]

    const response = await deliver({
      client_reference_id: null,
      payment_link: 'plink_1',
      amount_total: 30000,
      customer_details: { name: 'Test Dancer', email: 'Dancer@Example.com', phone: null },
    })

    expect(response.status).toBe(200)
    expect(mockEnrollStudent).toHaveBeenCalledWith(expect.anything(), expect.anything(), studentId, classId, 'full')
    expect(writes).toContainEqual(expect.objectContaining({
      table: 'class_purchases',
      op: 'upsert',
      payload: expect.objectContaining({ buyer_email: 'dancer@example.com', amount_paid: 300, student_id: null }),
    }))
    expect(writes).toContainEqual({ table: 'class_purchases', op: 'update', payload: { student_id: studentId } })
  })

  it('books a raw-link sale with no matching dancer as not yet linked', async () => {
    const response = await deliver({
      client_reference_id: null,
      payment_link: 'plink_1',
      amount_total: 27000,
      customer_details: { name: 'New Buyer', email: 'new@example.com', phone: null },
    })

    expect(response.status).toBe(200)
    expect(mockEnrollStudent).not.toHaveBeenCalled()
    expect(writes.filter(w => w.table === 'class_purchases').map(w => w.op)).toEqual(['upsert'])
  })

  it('ignores a payment link that is no class\'s', async () => {
    mockRetrieveLink.mockResolvedValue({ url: 'https://buy.stripe.com/something-else' })

    const response = await deliver({ client_reference_id: null, payment_link: 'plink_9' })

    expect(response.status).toBe(200)
    expect(writes).toEqual([])
  })

  it('acknowledges sessions that are neither class sign-ups nor lesson packs', async () => {
    const response = await deliver({ client_reference_id: null, metadata: {} })

    expect(response.status).toBe(200)
    expect(mockEnrollStudent).not.toHaveBeenCalled()
  })
})
