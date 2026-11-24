import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentUserWithRole = vi.fn()
const mockFindCurrentDancerStudent = vi.fn()
const mockRefund = vi.fn()

let classRow: Record<string, unknown> | null = null
let updates: { table: string; values: unknown }[] = []

const createChain = (table: string) => {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'is']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.update = vi.fn((values: unknown) => {
    updates.push({ table, values })
    return chain
  })
  chain.single = vi.fn(() => Promise.resolve({ data: classRow, error: classRow ? null : { message: 'not found' } }))
  chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
  chain.then = (resolve: (value: unknown) => unknown) => resolve({ data: null, error: null })
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn((table: string) => createChain(table)) })),
}))

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentUserWithRole: () => mockGetCurrentUserWithRole(),
  findCurrentDancerStudent: () => mockFindCurrentDancerStudent(),
}))

vi.mock('@/lib/lesson-credits', () => ({
  refundCreditForClass: (args: unknown) => mockRefund(args),
}))

vi.mock('@/lib/notifications/private-lessons', () => ({
  notifyCancellation: vi.fn(async () => undefined),
}))

vi.mock('@/lib/google/calendar', () => ({
  deleteMeetEvent: vi.fn(async () => undefined),
}))

import { POST } from '../classes/[id]/cancel/route'

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

const enrollment = (studentId: string, profileId: string) => ({
  id: `e-${studentId}`,
  student_id: studentId,
  students: { id: studentId, full_name: 'Dancer', profile_id: profileId, profile: null },
})

const makeClass = (overrides: Record<string, unknown> = {}) => ({
  id: 'class-1',
  instructor_id: 'instructor-1',
  start_time: future(3),
  class_type: 'private',
  is_cancelled: false,
  google_calendar_event_id: null,
  enrollments: [enrollment('student-1', 'dancer-1')],
  ...overrides,
})

const cancel = () =>
  POST(
    new NextRequest('http://localhost:3434/api/classes/class-1/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason: 'sick' }),
    }),
    { params: Promise.resolve({ id: 'class-1' }) }
  )

const cancelledClass = () => updates.some(u => u.table === 'classes')

describe('POST /api/classes/[id]/cancel', () => {
  beforeEach(() => {
    updates = []
    classRow = makeClass()
    mockRefund.mockReset().mockResolvedValue({ refunded: true })
    mockGetCurrentUserWithRole.mockResolvedValue({ id: 'dancer-1', role: 'dancer' })
    mockFindCurrentDancerStudent.mockResolvedValue({ id: 'student-1', profile_id: 'dancer-1' })
  })

  it('lets a dancer cancel her own private lesson', async () => {
    const response = await cancel()

    expect(response.status).toBe(200)
    expect(cancelledClass()).toBe(true)
  })

  it.each(['group', 'workshop', 'master_class'])('refuses to cancel a %s class for an enrolled dancer', async classType => {
    classRow = makeClass({ class_type: classType })

    const response = await cancel()

    expect(response.status).toBe(400)
    expect(cancelledClass()).toBe(false)
    expect(mockRefund).not.toHaveBeenCalled()
  })

  it('refuses a dancer who is not enrolled in the lesson', async () => {
    classRow = makeClass({ enrollments: [enrollment('student-2', 'dancer-2')] })

    const response = await cancel()

    expect(response.status).toBe(403)
    expect(cancelledClass()).toBe(false)
    expect(mockRefund).not.toHaveBeenCalled()
  })

  it('refuses a dancer when someone else is also enrolled', async () => {
    classRow = makeClass({
      enrollments: [enrollment('student-1', 'dancer-1'), enrollment('student-2', 'dancer-2')],
    })

    const response = await cancel()

    expect(response.status).toBe(403)
    expect(cancelledClass()).toBe(false)
  })

  it('refuses a dancer with no student record', async () => {
    mockFindCurrentDancerStudent.mockResolvedValue(null)

    const response = await cancel()

    expect(response.status).toBe(403)
    expect(cancelledClass()).toBe(false)
  })

  it('lets the owning instructor cancel', async () => {
    mockGetCurrentUserWithRole.mockResolvedValue({ id: 'instructor-1', role: 'instructor' })

    const response = await cancel()

    expect(response.status).toBe(200)
    expect(cancelledClass()).toBe(true)
  })

  it("refuses another instructor's lesson", async () => {
    mockGetCurrentUserWithRole.mockResolvedValue({ id: 'instructor-2', role: 'instructor' })

    const response = await cancel()

    expect(response.status).toBe(403)
    expect(cancelledClass()).toBe(false)
    expect(mockRefund).not.toHaveBeenCalled()
  })

  it('lets an admin cancel any private lesson', async () => {
    mockGetCurrentUserWithRole.mockResolvedValue({ id: 'admin-1', role: 'admin' })

    const response = await cancel()

    expect(response.status).toBe(200)
    expect(cancelledClass()).toBe(true)
  })
})
