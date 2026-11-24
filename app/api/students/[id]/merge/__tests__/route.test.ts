import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

type Call = {
  table: string
  op: 'select' | 'update' | 'delete'
  values?: unknown
  filters: [string, unknown][]
}
type Result = { data: unknown; error: unknown }
type Respond = (call: Call) => Result

// A client whose queries are answered by `respond` and logged in `calls`
const fakeClient = (calls: Call[], respond: () => Respond) => ({
  from: vi.fn((table: string) => {
    const call: Call = { table, op: 'select', filters: [] }
    const run = () => {
      calls.push(call)
      return Promise.resolve(respond()(call))
    }
    const chain: Record<string, unknown> = {}
    chain.select = vi.fn(() => chain)
    chain.update = vi.fn((values: unknown) => {
      Object.assign(call, { op: 'update', values })
      return chain
    })
    chain.delete = vi.fn(() => {
      call.op = 'delete'
      return chain
    })
    chain.eq = vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value])
      return chain
    })
    chain.in = vi.fn((column: string, value: unknown) => {
      call.filters.push([column, value])
      return chain
    })
    chain.single = vi.fn(run)
    chain.then = (resolve: (r: Result) => unknown, reject: (e: unknown) => unknown) =>
      run().then(resolve, reject)
    return chain
  }),
})

const sessionCalls: Call[] = []
const adminCalls: Call[] = []
let sessionRespond: Respond
let adminRespond: Respond

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => fakeClient(sessionCalls, () => sessionRespond)),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => fakeClient(adminCalls, () => adminRespond)),
}))

vi.mock('@/lib/auth/server-auth', () => ({
  requireInstructor: vi.fn(async () => ({ id: 'instructor-1', role: 'instructor' })),
}))

import { POST } from '../route'

const SOURCE = 'student-unlinked'
const TARGET = 'student-linked'

const ok = (data: unknown): Result => ({ data, error: null })

const sourceStudent = { id: SOURCE, profile_id: null, goals: 'Turns', skill_level: null }
const targetStudent = {
  id: TARGET,
  profile_id: 'dancer-1',
  goals: null,
  skill_level: 'advanced',
  profile: { full_name: 'Ava Dancer', email: 'ava@example.com' },
}

// RLS-shaped session client: reads students, can update/delete students only
const session: Respond = (call) => {
  if (call.table !== 'students') {
    // The instructor's session can't write the child tables; it must not be used for them
    return ok([])
  }
  if (call.op === 'select') {
    const id = call.filters.find(([column]) => column === 'id')?.[1]
    if (id === SOURCE) return ok(sourceStudent)
    if (id === TARGET) return ok(targetStudent)
  }
  return ok(null)
}

const purchases = [{ id: 'pack-1' }, { id: 'pack-2' }]

const admin = (overrides: Partial<Record<string, Result>> = {}): Respond => (call) => {
  const override = overrides[`${call.table}:${call.op}`]
  if (override) return override
  if (call.op === 'update' && call.table === 'lesson_pack_purchases') return ok(purchases)
  if (call.op === 'update' && call.table === 'payments') return ok([{ id: 'pay-1' }])
  return ok([])
}

const merge = () =>
  POST(
    new NextRequest(`http://localhost:5000/api/students/${SOURCE}/merge`, {
      method: 'POST',
      body: JSON.stringify({ target_student_id: TARGET }),
    }),
    { params: Promise.resolve({ id: SOURCE }) }
  )

const find = (calls: Call[], table: string, op: Call['op']) =>
  calls.filter(c => c.table === table && c.op === op)

describe('POST /api/students/[id]/merge', () => {
  beforeEach(() => {
    sessionCalls.length = 0
    adminCalls.length = 0
    sessionRespond = session
    adminRespond = admin()
  })

  it('moves lesson-pack purchases to the target with the service role and counts them', async () => {
    const response = await merge()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.records_transferred.lesson_pack_purchases).toBe(2)
    expect(body.records_transferred.payments).toBe(1)

    const [packMove] = find(adminCalls, 'lesson_pack_purchases', 'update')
    expect(packMove.values).toEqual({ student_id: TARGET })
    expect(packMove.filters).toEqual([['student_id', SOURCE]])

    // Nothing but students goes through the RLS-bound session client
    expect(sessionCalls.every(c => c.table === 'students')).toBe(true)

    // The source is deleted only after its rows have moved
    const deleteIndex = sessionCalls.findIndex(c => c.op === 'delete')
    expect(sessionCalls[deleteIndex].filters).toEqual([['id', SOURCE]])
    expect(find(sessionCalls, 'students', 'update')[0].values).toEqual({ goals: 'Turns' })
  })

  it('moves reviews, feedback, class sales, reschedule requests and personal classes', async () => {
    const studentOf = (call: Call) => call.filters.find(([column]) => column === 'student_id')?.[1]
    adminRespond = (call) => {
      if (call.table === 'reviews' && call.op === 'select') {
        // Both students reviewed instructor-1; the source also reviewed instructor-2
        return studentOf(call) === SOURCE
          ? ok([{ id: 'rev-src-1', instructor_id: 'instructor-1' }, { id: 'rev-src-2', instructor_id: 'instructor-2' }])
          : ok([{ instructor_id: 'instructor-1' }])
      }
      if (call.table === 'reviews' && call.op === 'update') return ok([{ id: 'rev-src-2' }])
      if (call.table === 'class_purchases' && call.op === 'update') return ok([{ id: 'sale-1' }])
      if (call.table === 'class_feedback' && call.op === 'update') return ok([{ id: 'fb-1' }])
      if (call.table === 'lesson_reschedule_requests' && call.op === 'update') return ok([{ id: 'rr-1' }])
      if (call.table === 'personal_classes' && call.op === 'update') return ok([{ id: 'pc-1' }])
      return ok([])
    }

    const response = await merge()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.records_transferred).toMatchObject({
      reviews: 1,
      class_purchases: 1,
      class_feedback: 1,
      lesson_reschedule_requests: 1,
      personal_classes: 1,
    })

    // The target's own review of instructor-1 wins; the source's duplicate goes
    const [reviewDelete] = find(adminCalls, 'reviews', 'delete')
    expect(reviewDelete.filters).toEqual([['id', ['rev-src-1']]])

    for (const table of ['class_purchases', 'class_feedback', 'lesson_reschedule_requests', 'personal_classes']) {
      const [moveCall] = find(adminCalls, table, 'update')
      expect(moveCall.values).toEqual({ student_id: TARGET })
      expect(moveCall.filters).toEqual([['student_id', SOURCE]])
    }
  })

  it('returns an error and keeps the source student when the purchase transfer fails', async () => {
    adminRespond = admin({
      'lesson_pack_purchases:update': { data: null, error: { message: 'permission denied' } },
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await merge()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toMatch(/lesson_pack_purchases/)
    expect(find(sessionCalls, 'students', 'delete')).toHaveLength(0)
    // Later steps don't run once one fails
    expect(find(adminCalls, 'waivers', 'update')).toHaveLength(0)

    consoleError.mockRestore()
  })
})
