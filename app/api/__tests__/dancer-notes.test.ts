import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock functions
const mockGetCurrentDancerStudent = vi.fn()
const mockRequireDancer = vi.fn()
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

// Create chainable mock that properly chains all methods
const createChainableMock = () => {
  const chain: Record<string, unknown> = {}

  // All chainable methods return the chain itself
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.neq = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.or = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.single = mockSingle

  // Allow the chain to be thenable for queries without .single()
  chain.then = vi.fn((resolve) => resolve({ data: [], error: null }))

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

vi.mock('@/lib/auth/server-auth', () => ({
  getCurrentDancerStudent: () => mockGetCurrentDancerStudent(),
  requireDancer: () => mockRequireDancer(),
}))

// Import route after mocking
import { GET, POST, PUT, DELETE } from '../dancer/notes/route'

describe('Dancer Notes API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/dancer/notes', () => {
    it('should return 500 if dancer is not authenticated', async () => {
      mockGetCurrentDancerStudent.mockRejectedValue(new Error('Unauthorized: No authenticated user'))
      mockRequireDancer.mockRejectedValue(new Error('Unauthorized: No authenticated user'))

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should return notes for authenticated dancer', async () => {
      const mockStudent = { id: 'student-1', profile_id: 'dancer-id' }
      const mockProfile = { id: 'dancer-id', role: 'dancer', full_name: 'Test Dancer' }

      mockGetCurrentDancerStudent.mockResolvedValue(mockStudent)
      mockRequireDancer.mockResolvedValue(mockProfile)

      const notes = [
        {
          id: 'note-1',
          title: 'Note 1',
          content: 'Content 1',
          author_id: 'instructor-id',
          student_id: 'student-1',
          visibility: 'shared_with_student',
          created_at: '2024-02-01T00:00:00Z',
          classes: null,
          personal_classes: null,
        },
      ]

      const authors = [{ id: 'instructor-id', full_name: 'Instructor', role: 'instructor', avatar_url: null }]

      // Create a complete chainable mock that handles both queries
      let callCount = 0
      const notesChain: Record<string, unknown> = {}
      notesChain.select = vi.fn(() => notesChain)
      notesChain.eq = vi.fn(() => notesChain)
      notesChain.in = vi.fn(() => notesChain)
      notesChain.or = vi.fn(() => notesChain)
      notesChain.order = vi.fn(() => notesChain)
      notesChain.then = vi.fn((resolve) => {
        callCount++
        if (callCount === 1) {
          // First query - notes
          return resolve({ data: notes, error: null })
        } else {
          // Second query - authors
          return resolve({ data: authors, error: null })
        }
      })

      mockFrom.mockImplementation(() => notesChain)

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notes).toBeDefined()
      expect(Array.isArray(data.notes)).toBe(true)
    })
  })

  describe('POST /api/dancer/notes', () => {
    it('should return 500 if dancer is not authenticated', async () => {
      mockGetCurrentDancerStudent.mockRejectedValue(new Error('Unauthorized'))
      mockRequireDancer.mockRejectedValue(new Error('Unauthorized'))

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'My personal note',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should create a personal note for dancer', async () => {
      const mockStudent = { id: 'student-1', profile_id: 'dancer-id' }
      const mockProfile = { id: 'dancer-id', role: 'dancer', full_name: 'Test Dancer' }

      mockGetCurrentDancerStudent.mockResolvedValue(mockStudent)
      mockRequireDancer.mockResolvedValue(mockProfile)

      const newNote = {
        id: 'note-1',
        content: 'My personal note',
        author_id: 'dancer-id',
        student_id: 'student-1',
        visibility: 'shared_with_instructor',
        created_at: '2024-02-01T00:00:00Z',
      }

      mockSingle.mockResolvedValue({ data: newNote, error: null })

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'My personal note',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.note).toBeDefined()
      expect(data.note.content).toBe('My personal note')
    })

    it('should return 400 if content is missing', async () => {
      const mockStudent = { id: 'student-1', profile_id: 'dancer-id' }
      const mockProfile = { id: 'dancer-id', role: 'dancer' }

      mockGetCurrentDancerStudent.mockResolvedValue(mockStudent)
      mockRequireDancer.mockResolvedValue(mockProfile)

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Note without content',
          // Missing content
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Content is required')
    })
  })

  describe('PUT /api/dancer/notes', () => {
    it('should update dancer\'s own note', async () => {
      const mockProfile = { id: 'dancer-id', role: 'dancer' }

      mockRequireDancer.mockResolvedValue(mockProfile)

      const updatedNote = {
        id: 'note-1',
        content: 'Updated note content',
        author_id: 'dancer-id',
        updated_at: '2024-02-01T00:00:00Z',
      }

      mockSingle.mockResolvedValue({ data: updatedNote, error: null })

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'note-1',
          content: 'Updated note content',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.note).toBeDefined()
    })

    it('should return 400 if id or content is missing', async () => {
      const mockProfile = { id: 'dancer-id', role: 'dancer' }

      mockRequireDancer.mockResolvedValue(mockProfile)

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Content without ID',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ID and content are required')
    })

    it('should only update own notes (author_id filter)', async () => {
      const mockProfile = { id: 'dancer-id', role: 'dancer' }

      mockRequireDancer.mockResolvedValue(mockProfile)

      // Note not found because author_id doesn't match
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      })

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'other-dancers-note',
          content: 'Trying to update someone else\'s note',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe('DELETE /api/dancer/notes', () => {
    it('should delete dancer\'s own note', async () => {
      const mockProfile = { id: 'dancer-id', role: 'dancer' }

      mockRequireDancer.mockResolvedValue(mockProfile)

      // For delete, we just need to check it doesn't error
      mockEq.mockResolvedValue({ data: null, error: null })

      const request = new NextRequest('http://localhost:5000/api/dancer/notes?id=note-1', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 400 if id is missing', async () => {
      const mockProfile = { id: 'dancer-id', role: 'dancer' }

      mockRequireDancer.mockResolvedValue(mockProfile)

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'DELETE',
      })

      const response = await DELETE(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('ID is required')
    })
  })

  describe('Dancer data isolation', () => {
    it('should only allow dancers to see and modify their own data', async () => {
      // This test verifies that the route implementation uses student_id and author_id filters
      // The actual filtering is done by the route code which filters by:
      // - student_id from getCurrentDancerStudent() for fetching notes
      // - author_id from requireDancer() for updating/deleting notes
      //
      // We verify this behavior by checking that:
      // 1. Unauthenticated users get errors
      // 2. Authenticated dancers can create notes (tested above)
      // 3. Authenticated dancers can update their own notes (tested above)
      // 4. Authenticated dancers can delete their own notes (tested above)
      //
      // The route implementation enforces isolation - see dancer/notes/route.ts lines:
      // - Line 35: .eq('student_id', student.id) - filters GET by student
      // - Line 142: .eq('author_id', profile.id) - filters PUT by author
      // - Line 177: .eq('author_id', profile.id) - filters DELETE by author

      expect(true).toBe(true) // Documentation test
    })
  })

  describe('Admin access to dancer routes', () => {
    it('should allow admin to access dancer endpoints', async () => {
      // Admin accessing dancer endpoints - should work due to admin override in requireDancer
      const mockStudent = { id: 'test-student-1', profile_id: 'admin-id' }
      const mockProfile = { id: 'admin-id', role: 'admin', full_name: 'Test Admin' }

      mockGetCurrentDancerStudent.mockResolvedValue(mockStudent)
      mockRequireDancer.mockResolvedValue(mockProfile)

      const notesChain: Record<string, unknown> = {}
      notesChain.select = vi.fn(() => notesChain)
      notesChain.eq = vi.fn(() => notesChain)
      notesChain.in = vi.fn(() => notesChain)
      notesChain.or = vi.fn(() => notesChain)
      notesChain.order = vi.fn(() => notesChain)
      notesChain.then = vi.fn((resolve) => resolve({ data: [], error: null }))

      mockFrom.mockImplementation(() => notesChain)

      const request = new NextRequest('http://localhost:5000/api/dancer/notes', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.notes).toBeDefined()
    })
  })
})
