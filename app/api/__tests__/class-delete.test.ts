import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetCurrentUserWithRole = vi.fn()
const mockRefund = vi.fn()
const mockDeleteMeetEvent = vi.fn()

// Each awaited user-client query (or .single()) takes the next result in order
let results: { data: unknown; error: unknown }[] = []
let eqCalls: [string, unknown][] = []
let deletedIn: unknown = null

const createChain = () => {
  const chain: Record<string, unknown> = {}
  for (const method of ['select', 'neq', 'gte', 'order']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.eq = vi.fn((column: string, value: unknown) => {
    eqCalls.push([column, value])
    return chain
  })
  chain.in = vi.fn((_column: string, values: unknown) => {
    deletedIn = values
    return chain
  })
  chain.delete = vi.fn(() => chain)
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
  getCurrentUserWithRole: () => mockGetCurrentUserWithRole(),
}))

vi.mock('@/lib/lesson-credits', () => ({
  refundCreditForClass: (args: unknown) => mockRefund(args),
}))

vi.mock('@/lib/google/calendar', () => ({
  createMeetEvent: vi.fn(),
  updateMeetEventTime: vi.fn(),
  deleteMeetEvent: (eventId: string) => mockDeleteMeetEvent(eventId),
}))

vi.mock('@/lib/notifications/private-lessons', () => ({
  notifyDancerVirtualLesson: vi.fn(),
}))

import { DELETE } from '../classes/[id]/route'

const ok = (data: unknown) => ({ data, error: null })

const remove = (id: string, scope?: 'series') =>
  DELETE(
    new NextRequest(`http://localhost:5000/api/classes/${id}${scope ? `?scope=${scope}` : ''}`, {
      method: 'DELETE',
    }),
    { params: Promise.resolve({ id }) }
  )

describe('DELETE /api/classes/[id]', () => {
  beforeEach(() => {
    results = []
    eqCalls = []
    deletedIn = null
    mockRefund.mockReset().mockResolvedValue({ refunded: true })
    mockDeleteMeetEvent.mockReset().mockResolvedValue(undefined)
    mockGetCurrentUserWithRole.mockResolvedValue({ id: 'instructor-1', role: 'instructor' })
  })

  it("refuses another instructor's class without refunding its credit", async () => {
    results = [{ data: null, error: { code: 'PGRST116' } }]

    const response = await remove('someone-elses-class')

    expect(response.status).toBe(404)
    expect(eqCalls).toContainEqual(['instructor_id', 'instructor-1'])
    expect(mockRefund).not.toHaveBeenCalled()
    expect(mockDeleteMeetEvent).not.toHaveBeenCalled()
    expect(deletedIn).toBeNull()
  })

  it('refunds and deletes an owned class', async () => {
    results = [
      ok({ id: 'class-1', series_id: null, google_calendar_event_id: 'evt-1' }),
      ok([{ id: 'class-1' }]),
    ]

    const response = await remove('class-1')
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.deleted_ids).toEqual(['class-1'])
    expect(mockRefund).toHaveBeenCalledWith(expect.objectContaining({ classId: 'class-1' }))
    expect(mockDeleteMeetEvent).toHaveBeenCalledWith('evt-1')
    expect(deletedIn).toEqual(['class-1'])
  })

  it('refunds only the owned upcoming days of a series', async () => {
    results = [
      ok({ id: 'day-1', series_id: 'series-1', google_calendar_event_id: null }),
      ok([{ id: 'day-2', google_calendar_event_id: null }]),
      ok([{ id: 'day-1' }, { id: 'day-2' }]),
    ]

    const response = await remove('day-1', 'series')

    expect(response.status).toBe(200)
    expect(mockRefund.mock.calls.map(([args]) => args.classId)).toEqual(['day-1', 'day-2'])
    expect(deletedIn).toEqual(['day-1', 'day-2'])
  })

  it('reports failure when the delete removes fewer classes than authorized', async () => {
    results = [
      ok({ id: 'class-1', series_id: null, google_calendar_event_id: null }),
      ok([]),
    ]

    const response = await remove('class-1')

    expect(response.status).toBe(500)
  })

  it('lets an admin delete any class without an ownership filter', async () => {
    mockGetCurrentUserWithRole.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    results = [
      ok({ id: 'class-9', series_id: null, google_calendar_event_id: null }),
      ok([{ id: 'class-9' }]),
    ]

    const response = await remove('class-9')

    expect(response.status).toBe(200)
    expect(eqCalls.some(([column]) => column === 'instructor_id')).toBe(false)
  })
})
