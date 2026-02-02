import { vi } from 'vitest'

// Mock Supabase query builder chain
export const createMockQueryBuilder = (data: unknown = null, error: Error | null = null) => {
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
    single: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then: vi.fn((resolve) => resolve({ data, error })),
  }
  return builder
}

// Mock Supabase client
export const createMockSupabaseClient = (overrides: Record<string, unknown> = {}) => {
  const defaultQueryBuilder = createMockQueryBuilder()

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
    },
    from: vi.fn().mockReturnValue(defaultQueryBuilder),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        download: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: '' } }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    ...overrides,
  }
}

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

// Mock instructor profile
export const mockInstructorProfile = {
  id: 'test-user-id',
  email: 'instructor@example.com',
  full_name: 'Test Instructor',
  role: 'instructor',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock dancer profile
export const mockDancerProfile = {
  id: 'test-dancer-id',
  email: 'dancer@example.com',
  full_name: 'Test Dancer',
  role: 'dancer',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock admin profile
export const mockAdminProfile = {
  id: 'test-admin-id',
  email: 'admin@example.com',
  full_name: 'Test Admin',
  role: 'admin',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock student record
export const mockStudent = {
  id: 'test-student-id',
  profile_id: 'test-dancer-id',
  full_name: 'Test Dancer',
  email: 'dancer@example.com',
  phone: '555-1234',
  date_of_birth: '2000-01-01',
  instructor_id: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Mock class data
export const mockClass = {
  id: 'test-class-id',
  title: 'Ballet Basics',
  description: 'Introductory ballet class',
  instructor_id: 'test-user-id',
  studio_id: 'test-studio-id',
  start_time: '2024-02-01T10:00:00Z',
  end_time: '2024-02-01T11:00:00Z',
  pricing_model: 'per_person',
  pricing_data: { pricePerPerson: 50 },
  is_public: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}
