import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the Supabase client
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

// Import routes after mocking
import { POST as signupHandler } from '../auth/signup/route'
import { POST as signinHandler } from '../auth/signin/route'
import { POST as signoutHandler } from '../auth/signout/route'

describe('Auth API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/signup', () => {
    it('should create a new user account successfully', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'newuser@test.com',
        user_metadata: { full_name: 'New User', role: 'dancer' },
      }

      mockSignUp.mockResolvedValue({
        data: { user: newUser, session: null },
        error: null,
      })

      // Mock profile query (for guardian check)
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@test.com',
          password: 'password123',
          fullName: 'New User',
          role: 'dancer',
          isAtLeast13: true,
        }),
      })

      const response = await signupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.redirectUrl).toBe('/dancer')
    })

    it('should redirect instructor to /instructor portal', async () => {
      const newUser = {
        id: 'new-instructor-id',
        email: 'instructor@test.com',
        user_metadata: { full_name: 'New Instructor', role: 'instructor' },
      }

      mockSignUp.mockResolvedValue({
        data: { user: newUser, session: null },
        error: null,
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'instructor@test.com',
          password: 'password123',
          fullName: 'New Instructor',
          role: 'instructor',
          isAtLeast13: true,
        }),
      })

      const response = await signupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.redirectUrl).toBe('/instructor')
    })

    it('should return error for signup failure', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already in use' },
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@test.com',
          password: 'password123',
          fullName: 'Existing User',
          role: 'dancer',
          isAtLeast13: true,
        }),
      })

      const response = await signupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email already in use')
    })

    it('should handle guardian creation for under-13 dancers', async () => {
      const newUser = {
        id: 'young-dancer-id',
        email: 'young@test.com',
        user_metadata: { full_name: 'Young Dancer', role: 'dancer' },
      }

      mockSignUp.mockResolvedValue({
        data: { user: newUser, session: null },
        error: null,
      })

      // Mock guardian profile check and creation
      const mockInsert = vi.fn().mockReturnThis()
      const mockSelect = vi.fn().mockReturnThis()
      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // Guardian not found
          .mockResolvedValueOnce({ data: { id: 'new-guardian-id' }, error: null }), // After insert
        insert: mockInsert,
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'young@test.com',
          password: 'password123',
          fullName: 'Young Dancer',
          role: 'dancer',
          isAtLeast13: false,
          guardianEmail: 'parent@test.com',
        }),
      })

      const response = await signupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject admin self-registration for security', async () => {
      // Admin role cannot be self-registered - must be assigned by existing admin
      const request = new NextRequest('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'password123',
          fullName: 'Admin User',
          role: 'admin',
          portal: 'dancer',
          isAtLeast13: true,
        }),
      })

      const response = await signupHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid role')
    })
  })

  describe('POST /api/auth/signin', () => {
    it('should sign in user and redirect to correct portal', async () => {
      // Note: signin route gets role from user_metadata, not database
      const user = {
        id: 'dancer-id',
        email: 'dancer@test.com',
        user_metadata: { role: 'dancer' },
      }

      mockSignInWithPassword.mockResolvedValue({
        data: { user, session: { access_token: 'token' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'dancer@test.com',
          password: 'password123',
        }),
      })

      const response = await signinHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.redirectUrl).toBe('/dancer')
    })

    it('should redirect instructor to /instructor', async () => {
      const user = {
        id: 'instructor-id',
        email: 'instructor@test.com',
        user_metadata: { role: 'instructor' },
      }

      mockSignInWithPassword.mockResolvedValue({
        data: { user, session: { access_token: 'token' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'instructor@test.com',
          password: 'password123',
        }),
      })

      const response = await signinHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.redirectUrl).toBe('/instructor')
    })

    it('should return error for invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@test.com',
          password: 'wrongpassword',
        }),
      })

      const response = await signinHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Invalid')
    })

    it('should allow admin to choose portal during signin', async () => {
      const user = {
        id: 'admin-id',
        email: 'admin@test.com',
        user_metadata: { role: 'admin' },
      }

      mockSignInWithPassword.mockResolvedValue({
        data: { user, session: { access_token: 'token' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'password123',
          portal: 'dancer', // Admin choosing dancer portal
        }),
      })

      const response = await signinHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.redirectUrl).toBe('/dancer')
    })

    it('should default to dancer role if no user_metadata role', async () => {
      const user = {
        id: 'user-id',
        email: 'user@test.com',
        user_metadata: {}, // No role set
      }

      mockSignInWithPassword.mockResolvedValue({
        data: { user, session: { access_token: 'token' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:5000/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@test.com',
          password: 'password123',
        }),
      })

      const response = await signinHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.redirectUrl).toBe('/dancer') // Defaults to dancer
    })
  })

  describe('POST /api/auth/signout', () => {
    it('should sign out user successfully', async () => {
      mockSignOut.mockResolvedValue({ error: null })

      const request = new NextRequest('http://localhost:5000/api/auth/signout', {
        method: 'POST',
      })

      const response = await signoutHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockSignOut).toHaveBeenCalled()
    })

    // Note: Current implementation doesn't check signOut error, just returns success
    // This test documents that behavior - the error is silently ignored
    it('should return success even if signOut has an error (current behavior)', async () => {
      mockSignOut.mockResolvedValue({ error: { message: 'Sign out failed' } })

      const request = new NextRequest('http://localhost:5000/api/auth/signout', {
        method: 'POST',
      })

      const response = await signoutHandler(request)
      const data = await response.json()

      // Current implementation ignores errors from signOut
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle thrown exceptions', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:5000/api/auth/signout', {
        method: 'POST',
      })

      const response = await signoutHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })
})
