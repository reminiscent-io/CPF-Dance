import { describe, it, expect, vi, beforeEach } from 'vitest'

type QueryResult = { data: unknown; error: unknown }

interface RecordedQuery {
  table: string
  filters: Array<[string, unknown]>
  orders: string[]
}

const mockGetUser = vi.fn()
let profilesById: Record<string, Record<string, unknown>> = {}
let studentsResult: QueryResult = { data: null, error: null }
let queries: RecordedQuery[] = []

function createQuery(table: string) {
  const recorded: RecordedQuery = { table, filters: [], orders: [] }
  queries.push(recorded)

  const resolve = (): QueryResult => {
    if (table === 'profiles') {
      const id = recorded.filters.find(([column]) => column === 'id')?.[1] as string
      const profile = profilesById[id]
      return profile ? { data: profile, error: null } : { data: null, error: { code: 'PGRST116' } }
    }
    return studentsResult
  }

  const query = {
    select: () => query,
    eq: (column: string, value: unknown) => {
      recorded.filters.push([column, value])
      return query
    },
    order: (column: string) => {
      recorded.orders.push(column)
      return query
    },
    limit: () => query,
    single: async () => resolve(),
    maybeSingle: async () => resolve(),
  }
  return query
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => createQuery(table),
  }),
}))

import { requireRole, requireDancer, requireInstructor, getCurrentDancerStudent } from '../server-auth'

function signInAs(role: string, id = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id } }, error: null })
  profilesById = { [id]: { id, role, linked_profile_id: null } }
}

describe('server-auth role guards', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
    profilesById = {}
    studentsResult = { data: null, error: null }
    queries = []
  })

  describe('requireRole', () => {
    it('rejects a signed-out request', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
      await expect(requireRole('dancer')).rejects.toThrow('Unauthorized')
    })

    it('lets a guardian pass dancer guards', async () => {
      signInAs('guardian')
      await expect(requireDancer()).resolves.toMatchObject({ role: 'guardian' })
      await expect(requireRole('dancer')).resolves.toMatchObject({ role: 'guardian' })
    })

    it('keeps guardians out of instructor and admin guards', async () => {
      signInAs('guardian')
      await expect(requireInstructor()).rejects.toThrow('Forbidden')
      await expect(requireRole('admin')).rejects.toThrow('Forbidden')
    })

    it('keeps dancers out of guardian and instructor guards', async () => {
      signInAs('dancer')
      await expect(requireRole('guardian')).rejects.toThrow('Forbidden')
      await expect(requireInstructor()).rejects.toThrow('Forbidden')
    })

    it('keeps instructors out of dancer guards', async () => {
      signInAs('instructor')
      await expect(requireDancer()).rejects.toThrow('Forbidden')
    })

    it('lets admins pass every guard', async () => {
      signInAs('admin')
      for (const role of ['admin', 'instructor', 'dancer', 'guardian'] as const) {
        await expect(requireRole(role)).resolves.toMatchObject({ role: 'admin' })
      }
    })

    it('rejects an unrecognized role', async () => {
      signInAs('studio')
      await expect(requireDancer()).rejects.toThrow('Forbidden')
    })
  })

  describe('getCurrentDancerStudent', () => {
    const studentQuery = () => queries.find((q) => q.table === 'students')

    it("returns a dancer's own student record", async () => {
      signInAs('dancer', 'dancer-1')
      studentsResult = { data: { id: 'student-1', profile_id: 'dancer-1' }, error: null }

      await expect(getCurrentDancerStudent()).resolves.toEqual({ id: 'student-1', profile_id: 'dancer-1' })
      expect(studentQuery()?.filters).toEqual([['profile_id', 'dancer-1']])
    })

    it("returns a guardian's linked student", async () => {
      signInAs('guardian', 'guardian-1')
      studentsResult = { data: { id: 'student-2', profile_id: 'child-1' }, error: null }

      await expect(getCurrentDancerStudent()).resolves.toEqual({ id: 'student-2', profile_id: 'child-1' })
      expect(studentQuery()?.filters).toEqual([['guardian_id', 'guardian-1']])
    })

    it('picks the same student every time for a guardian with several', async () => {
      signInAs('guardian', 'guardian-1')
      studentsResult = { data: { id: 'student-2', profile_id: 'child-1' }, error: null }

      await getCurrentDancerStudent()
      expect(studentQuery()?.orders).toEqual(['created_at', 'id'])
    })

    it('throws when a guardian has no linked student', async () => {
      signInAs('guardian', 'guardian-1')
      studentsResult = { data: null, error: null }

      await expect(getCurrentDancerStudent()).rejects.toThrow('Student record not found')
    })

    it('throws when a dancer has no student record', async () => {
      signInAs('dancer', 'dancer-1')
      studentsResult = { data: null, error: { code: 'PGRST116' } }

      await expect(getCurrentDancerStudent()).rejects.toThrow('Student record not found')
    })

    it('rejects instructors before querying students', async () => {
      signInAs('instructor')

      await expect(getCurrentDancerStudent()).rejects.toThrow('Forbidden')
      expect(studentQuery()).toBeUndefined()
    })
  })
})
