import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock functions
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

// Create chainable mock
const createChainableMock = () => {
  const chain = {
    select: mockSelect.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    update: mockUpdate.mockReturnThis(),
    delete: mockDelete.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    single: mockSingle,
  }
  return chain
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom.mockImplementation(() => createChainableMock()),
  })),
}))

// Import route after mocking
import { POST, PUT, DELETE } from '../instructor/notes/route'

describe('Instructor Notes API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/instructor/notes', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test note',
          student_id: 'student-1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is not an instructor', async () => {
      const dancerUser = {
        id: 'dancer-id',
        email: 'dancer@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: dancerUser },
        error: null,
      })

      // Mock profile query returning dancer role
      mockSingle.mockResolvedValue({
        data: { role: 'dancer' },
        error: null,
      })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test note',
          student_id: 'student-1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should create note for instructor', async () => {
      const instructorUser = {
        id: 'instructor-id',
        email: 'instructor@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: instructorUser },
        error: null,
      })

      // First call - profile check returns instructor
      // Second call - insert note
      const newNote = {
        id: 'note-1',
        content: 'Test note content',
        student_id: 'student-1',
        author_id: 'instructor-id',
        created_at: '2024-02-01T00:00:00Z',
      }

      mockSingle
        .mockResolvedValueOnce({ data: { role: 'instructor' }, error: null }) // Profile check
        .mockResolvedValueOnce({ data: newNote, error: null }) // Insert result

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Test note content',
          student_id: 'student-1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.note).toBeDefined()
    })

    it('should allow admin to create notes (admin override)', async () => {
      const adminUser = {
        id: 'admin-id',
        email: 'admin@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: adminUser },
        error: null,
      })

      const newNote = {
        id: 'note-1',
        content: 'Admin note',
        author_id: 'admin-id',
      }

      mockSingle
        .mockResolvedValueOnce({ data: { role: 'admin' }, error: null }) // Profile check - admin
        .mockResolvedValueOnce({ data: newNote, error: null }) // Insert result

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Admin note',
          student_id: 'student-1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 if content is missing', async () => {
      const instructorUser = {
        id: 'instructor-id',
        email: 'instructor@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: instructorUser },
        error: null,
      })

      mockSingle.mockResolvedValueOnce({ data: { role: 'instructor' }, error: null })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'student-1',
          // Missing content
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Content is required')
    })

    it('should return 400 if content is empty', async () => {
      const instructorUser = {
        id: 'instructor-id',
        email: 'instructor@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: instructorUser },
        error: null,
      })

      mockSingle.mockResolvedValueOnce({ data: { role: 'instructor' }, error: null })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '   ', // Empty/whitespace only
          student_id: 'student-1',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Content is required')
    })
  })

  describe('PUT /api/instructor/notes', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'note-1',
          content: 'Updated content',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is dancer', async () => {
      const dancerUser = {
        id: 'dancer-id',
        email: 'dancer@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: dancerUser },
        error: null,
      })

      mockSingle.mockResolvedValue({
        data: { role: 'dancer' },
        error: null,
      })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'note-1',
          content: 'Updated content',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 400 if note ID is missing', async () => {
      const instructorUser = {
        id: 'instructor-id',
        email: 'instructor@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: instructorUser },
        error: null,
      })

      mockSingle.mockResolvedValueOnce({ data: { role: 'instructor' }, error: null })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Updated content',
          // Missing id
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Note ID is required')
    })

    it('should update note for instructor', async () => {
      const instructorUser = {
        id: 'instructor-id',
        email: 'instructor@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: instructorUser },
        error: null,
      })

      const updatedNote = {
        id: 'note-1',
        content: 'Updated content',
        updated_at: '2024-02-01T00:00:00Z',
      }

      mockSingle
        .mockResolvedValueOnce({ data: { role: 'instructor' }, error: null })
        .mockResolvedValueOnce({ data: updatedNote, error: null })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'note-1',
          content: 'Updated content',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.note).toBeDefined()
    })
  })

  describe('DELETE /api/instructor/notes', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes?id=note-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 if user is dancer', async () => {
      const dancerUser = {
        id: 'dancer-id',
        email: 'dancer@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: dancerUser },
        error: null,
      })

      mockSingle.mockResolvedValue({
        data: { role: 'dancer' },
        error: null,
      })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes?id=note-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Unauthorized')
    })

    it('should return 400 if note ID is missing', async () => {
      const instructorUser = {
        id: 'instructor-id',
        email: 'instructor@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: instructorUser },
        error: null,
      })

      mockSingle.mockResolvedValueOnce({ data: { role: 'instructor' }, error: null })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
        method: 'DELETE',
        // No id query param
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Note ID is required')
    })

    it('should delete note for instructor', async () => {
      const instructorUser = {
        id: 'instructor-id',
        email: 'instructor@test.com',
      }

      mockGetUser.mockResolvedValue({
        data: { user: instructorUser },
        error: null,
      })

      // Setup mock chain for delete
      const deleteMockChain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: { role: 'instructor' }, error: null }),
      }

      // For the delete operation, we need to return nothing (no error)
      deleteMockChain.eq.mockResolvedValueOnce({ data: null, error: null })

      mockFrom.mockImplementation(() => deleteMockChain)

      mockSingle
        .mockResolvedValueOnce({ data: { role: 'instructor' }, error: null })

      const request = new NextRequest('http://localhost:5000/api/instructor/notes?id=note-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Role-based access control', () => {
    const testCases = [
      { role: 'instructor', shouldAccess: true },
      { role: 'admin', shouldAccess: true },
      { role: 'dancer', shouldAccess: false },
      { role: 'guardian', shouldAccess: false },
    ]

    testCases.forEach(({ role, shouldAccess }) => {
      it(`should ${shouldAccess ? 'allow' : 'deny'} ${role} access to POST`, async () => {
        const user = {
          id: `${role}-id`,
          email: `${role}@test.com`,
        }

        mockGetUser.mockResolvedValue({
          data: { user },
          error: null,
        })

        if (shouldAccess) {
          const newNote = { id: 'note-1', content: 'Test' }
          mockSingle
            .mockResolvedValueOnce({ data: { role }, error: null })
            .mockResolvedValueOnce({ data: newNote, error: null })
        } else {
          mockSingle.mockResolvedValueOnce({ data: { role }, error: null })
        }

        const request = new NextRequest('http://localhost:5000/api/instructor/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Test note',
            student_id: 'student-1',
          }),
        })

        const response = await POST(request)

        if (shouldAccess) {
          expect(response.status).toBe(200)
        } else {
          expect(response.status).toBe(403)
        }
      })
    })
  })
})
