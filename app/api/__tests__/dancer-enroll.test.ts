import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentDancerStudent = vi.fn()

// Each awaited query (or .single()) takes the next result in order
let results: { data: unknown; error: unknown }[] = []
let inserted: unknown = null

const createChain = () => {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'neq', 'in', 'gte', 'order']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.insert = vi.fn((rows: unknown) => {
    inserted = rows
    return chain
  })
  chain.single = vi.fn(() => Promise.resolve(results.shift()))
  chain.then = (resolve: (value: unknown) => unknown) => resolve(results.shift())
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: vi.fn(() => createChain()) })),
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
  is_public: true,
  is_cancelled: false,
  max_capacity: 10,
  start_time: future(offset),
  enrollments: [],
  ...overrides,
})

const enroll = (classId: string) =>
  POST(new NextRequest('http://localhost:5000/api/dancer/enroll', {
    method: 'POST',
    body: JSON.stringify({ class_id: classId }),
  }))

describe('POST /api/dancer/enroll', () => {
  beforeEach(() => {
    results = []
    inserted = null
    mockGetCurrentDancerStudent.mockResolvedValue({ id: 'student-1' })
  })

  it('enrolls in every upcoming day of a workshop', async () => {
    const days = [day('fri', 3), day('sat', 4), day('sun', 5)]
    results = [
      { data: days[1], error: null },
      { data: days, error: null },
      { data: [], error: null },
      { data: days.map(d => ({ id: `e-${d.id}`, class_id: d.id })), error: null },
    ]

    const response = await enroll('sat')
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.enrolled_days).toBe(3)
    expect(body.enrollment.class_id).toBe('sat')
    expect(inserted).toEqual([
      { student_id: 'student-1', class_id: 'fri' },
      { student_id: 'student-1', class_id: 'sat' },
      { student_id: 'student-1', class_id: 'sun' },
    ])
  })

  it('skips days the dancer is already in', async () => {
    const days = [day('fri', 3), day('sat', 4)]
    results = [
      { data: days[0], error: null },
      { data: days, error: null },
      { data: [{ class_id: 'fri' }], error: null },
      { data: [{ id: 'e-sat', class_id: 'sat' }], error: null },
    ]

    const response = await enroll('fri')

    expect(response.status).toBe(201)
    expect(inserted).toEqual([{ student_id: 'student-1', class_id: 'sat' }])
  })

  it('refuses the whole workshop when one day is full', async () => {
    const days = [day('fri', 3), day('sat', 4, { max_capacity: 1, enrollments: [{ id: 'x' }] })]
    results = [
      { data: days[0], error: null },
      { data: days, error: null },
      { data: [], error: null },
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
      { data: weekly, error: null },
      { data: [], error: null },
      { data: [{ id: 'e-tue', class_id: 'tue' }], error: null },
    ]

    const response = await enroll('tue')

    expect(response.status).toBe(201)
    expect(inserted).toEqual([{ student_id: 'student-1', class_id: 'tue' }])
  })
})
