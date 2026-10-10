import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentDancerStudent = vi.fn()

// Each awaited query (or .single()) takes the next result in order, across
// both the user client and the service-role client
let results: { data: unknown; error: unknown }[] = []
let inserted: unknown = null
let updated: unknown = null

const createChain = () => {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'neq', 'in', 'gte', 'order']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.insert = vi.fn((rows: unknown) => {
    inserted = rows
    return chain
  })
  chain.update = vi.fn((values: unknown) => {
    updated = values
    return chain
  })
  chain.single = vi.fn(() => Promise.resolve(results.shift()))
  chain.then = (resolve: (value: unknown) => unknown) => resolve(results.shift())
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: vi.fn(() => createChain()) })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn(() => createChain()) })),
}))

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentDancerStudent: () => mockGetCurrentDancerStudent(),
}))

import { POST } from '../dancer/enroll/route'

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

const day = (id: string, offset: number, overrides: Record<string, unknown> = {}) => ({
  id,
  class_type: 'workshop',
  series_id: 'series-1',
  workshop_full_only: false,
  is_public: true,
  is_cancelled: false,
  max_capacity: 10,
  start_time: future(offset),
  ...overrides,
})

const enroll = (classId: string, option?: 'full' | 'day') =>
  POST(new NextRequest('http://localhost:5000/api/dancer/enroll', {
    method: 'POST',
    body: JSON.stringify({ class_id: classId, option }),
  }))

const ok = (data: unknown) => ({ data, error: null })

describe('POST /api/dancer/enroll', () => {
  beforeEach(() => {
    results = []
    inserted = null
    updated = null
    mockGetCurrentDancerStudent.mockResolvedValue({ id: 'student-1' })
  })

  it('enrolls in every upcoming day of a workshop', async () => {
    const days = [day('fri', 3), day('sat', 4), day('sun', 5)]
    results = [
      ok(days[1]),
      ok(days),
      ok([]), // own enrollments
      ok([]), // head counts
      ok(days.map(d => ({ id: `e-${d.id}`, class_id: d.id }))),
    ]

    const response = await enroll('sat')
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.enrolled_days).toBe(3)
    expect(body.enrollment.class_id).toBe('sat')
    expect(inserted).toEqual([
      { student_id: 'student-1', class_id: 'fri', workshop_pass: true },
      { student_id: 'student-1', class_id: 'sat', workshop_pass: true },
      { student_id: 'student-1', class_id: 'sun', workshop_pass: true },
    ])
  })

  it('skips days the dancer already holds a pass for', async () => {
    const days = [day('fri', 3), day('sat', 4)]
    results = [
      ok(days[0]),
      ok(days),
      ok([{ class_id: 'fri', workshop_pass: true }]),
      ok([]),
      ok([{ id: 'e-sat', class_id: 'sat' }]),
    ]

    const response = await enroll('fri')

    expect(response.status).toBe(201)
    expect(inserted).toEqual([{ student_id: 'student-1', class_id: 'sat', workshop_pass: true }])
    expect(updated).toBeNull()
  })

  it('turns an earlier drop-in into part of the pass', async () => {
    const days = [day('fri', 3), day('sat', 4)]
    results = [
      ok(days[0]),
      ok(days),
      ok([{ class_id: 'fri', workshop_pass: false }]),
      ok([]),
      ok([{ id: 'e-sat', class_id: 'sat' }]),
      ok(null), // upgrade
    ]

    const response = await enroll('fri', 'full')

    expect(response.status).toBe(201)
    expect(inserted).toEqual([{ student_id: 'student-1', class_id: 'sat', workshop_pass: true }])
    expect(updated).toEqual({ workshop_pass: true })
  })

  it('enrolls a drop-in in just that day', async () => {
    const days = [day('fri', 3), day('sat', 4)]
    results = [
      ok(days[1]),
      ok([]),
      ok([]),
      ok([{ id: 'e-sat', class_id: 'sat' }]),
    ]

    const response = await enroll('sat', 'day')
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.enrolled_days).toBe(1)
    expect(inserted).toEqual([{ student_id: 'student-1', class_id: 'sat', workshop_pass: false }])
  })

  it('refuses a drop-in when the workshop is full-run only', async () => {
    results = [ok(day('sat', 4, { workshop_full_only: true }))]

    const response = await enroll('sat', 'day')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('This workshop is sold as a full run only')
    expect(inserted).toBeNull()
  })

  it('refuses the whole workshop when one day is full', async () => {
    const days = [day('fri', 3), day('sat', 4, { max_capacity: 1 })]
    results = [
      ok(days[0]),
      ok(days),
      ok([]),
      ok([{ class_id: 'sat' }]), // someone else already holds sat's only spot
    ]

    const response = await enroll('fri')
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('One of the workshop days is full')
    expect(inserted).toBeNull()
  })

  it('enrolls in only the chosen class when it is not a workshop', async () => {
    const weekly = day('tue', 2, { class_type: 'group' })
    results = [
      ok(weekly),
      ok([]),
      ok([]),
      ok([{ id: 'e-tue', class_id: 'tue' }]),
    ]

    const response = await enroll('tue')

    expect(response.status).toBe(201)
    expect(inserted).toEqual([{ student_id: 'student-1', class_id: 'tue', workshop_pass: false }])
  })
})
