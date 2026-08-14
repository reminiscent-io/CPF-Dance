import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock user data
export const mockUsers = {
  instructor: {
    id: 'instructor-user-id',
    email: 'instructor@test.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  },
  dancer: {
    id: 'dancer-user-id',
    email: 'dancer@test.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  },
  admin: {
    id: 'admin-user-id',
    email: 'admin@test.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  },
  guardian: {
    id: 'guardian-user-id',
    email: 'guardian@test.com',
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
  },
}

// Mock profile data
export const mockProfiles = {
  instructor: {
    id: 'instructor-user-id',
    email: 'instructor@test.com',
    full_name: 'Test Instructor',
    role: 'instructor',
    phone: '555-0001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  dancer: {
    id: 'dancer-user-id',
    email: 'dancer@test.com',
    full_name: 'Test Dancer',
    role: 'dancer',
    phone: '555-0002',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  admin: {
    id: 'admin-user-id',
    email: 'admin@test.com',
    full_name: 'Test Admin',
    role: 'admin',
    phone: '555-0003',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  guardian: {
    id: 'guardian-user-id',
    email: 'guardian@test.com',
    full_name: 'Test Guardian',
    role: 'guardian',
    phone: '555-0004',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
}

// Mock student data
export const mockStudents = {
  dancer: {
    id: 'student-id-1',
    profile_id: 'dancer-user-id',
    full_name: 'Test Dancer',
    email: 'dancer@test.com',
    instructor_id: 'instructor-user-id',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
}

// Type for mock data store
interface MockDataStore {
  currentUser: typeof mockUsers.instructor | null
  currentProfile: typeof mockProfiles.instructor | null
  currentStudent: typeof mockStudents.dancer | null
  queryResults: Map<string, { data: unknown; error: unknown }>
}

// Create mock data store
export const createMockDataStore = (): MockDataStore => ({
  currentUser: null,
  currentProfile: null,
  currentStudent: null,
  queryResults: new Map(),
})

// Create a chainable query builder mock
export const createMockQueryBuilder = (
  store: MockDataStore,
  tableName: string
) => {
  let result: { data: unknown; error: unknown } = { data: null, error: null }

  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => {
      // Return stored result or default
      const storedResult = store.queryResults.get(tableName)
      if (storedResult) {
        return Promise.resolve(storedResult)
      }
      // Default behavior based on table
      if (tableName === 'profiles' && store.currentProfile) {
        return Promise.resolve({ data: store.currentProfile, error: null })
      }
      if (tableName === 'students' && store.currentStudent) {
        return Promise.resolve({ data: store.currentStudent, error: null })
      }
      return Promise.resolve(result)
    }),
    maybeSingle: vi.fn().mockImplementation(() => {
      const storedResult = store.queryResults.get(tableName)
      if (storedResult) {
        return Promise.resolve(storedResult)
      }
      return Promise.resolve(result)
    }),
    then: vi.fn().mockImplementation((resolve) => {
      const storedResult = store.queryResults.get(tableName)
      if (storedResult) {
        return resolve(storedResult)
      }
      return resolve(result)
    }),
  }

  // Allow setting custom result
  ;(builder as any).mockResolvedValue = (data: unknown, error: unknown = null) => {
    result = { data, error }
    store.queryResults.set(tableName, result)
    return builder
  }

  return builder
}

// Create mock Supabase client
export const createMockSupabaseClient = (store: MockDataStore) => {
  return {
    auth: {
      getUser: vi.fn().mockImplementation(() => {
        if (store.currentUser) {
          return Promise.resolve({ data: { user: store.currentUser }, error: null })
        }
        return Promise.resolve({ data: { user: null }, error: { message: 'Not authenticated' } })
      }),
      getSession: vi.fn().mockImplementation(() => {
        if (store.currentUser) {
          return Promise.resolve({
            data: { session: { user: store.currentUser, access_token: 'mock-token' } },
            error: null,
          })
        }
        return Promise.resolve({ data: { session: null }, error: null })
      }),
      signUp: vi.fn().mockImplementation(async ({ email, password, options }) => {
        // Simulate successful signup
        const newUser = {
          id: `new-user-${Date.now()}`,
          email,
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          user_metadata: options?.data || {},
        }
        return { data: { user: newUser, session: null }, error: null }
      }),
      signInWithPassword: vi.fn().mockImplementation(async ({ email, password }) => {
        // Find matching user
        const user = Object.values(mockUsers).find((u) => u.email === email)
        if (user) {
          return {
            data: { user, session: { user, access_token: 'mock-token' } },
            error: null,
          }
        }
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockImplementation((tableName: string) => {
      return createMockQueryBuilder(store, tableName)
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://mock-url.com' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  }
}

// Helper to set up authenticated context
export const setupAuthContext = (
  store: MockDataStore,
  role: 'instructor' | 'dancer' | 'admin' | 'guardian'
) => {
  store.currentUser = mockUsers[role]
  store.currentProfile = mockProfiles[role]
  if (role === 'dancer') {
    store.currentStudent = mockStudents.dancer
  }
}

// Helper to clear auth context
export const clearAuthContext = (store: MockDataStore) => {
  store.currentUser = null
  store.currentProfile = null
  store.currentStudent = null
  store.queryResults.clear()
}

// Create mock NextRequest
export const createMockRequest = (
  method: string,
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): NextRequest => {
  // NextRequest's init type is narrower than the DOM RequestInit (its `signal`
  // does not accept null), so borrow the constructor's own parameter type.
  const requestInit: ConstructorParameters<typeof NextRequest>[1] = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body)
  }

  return new NextRequest(new URL(url, 'http://localhost:5000'), requestInit)
}

// Parse JSON response
export const parseResponse = async (response: Response) => {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
