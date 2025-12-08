import type { Profile } from './types'

export const MOCK_PROFILES: Record<string, Profile> = {
  dancer: {
    id: 'mock-dancer-001',
    email: 'dancer@example.com',
    phone: '(555) 123-4567',
    full_name: 'Sarah Johnson',
    role: 'dancer',
    avatar_url: null,
    date_of_birth: '2005-06-15',
    guardian_id: null,
    consent_given: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  instructor: {
    id: 'mock-instructor-001',
    email: 'courtney@example.com',
    phone: '(555) 987-6543',
    full_name: 'Courtney Martinez',
    role: 'instructor',
    avatar_url: null,
    date_of_birth: '1985-03-20',
    guardian_id: null,
    consent_given: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  admin: {
    id: 'mock-admin-001',
    email: 'admin@system.com',
    phone: '(555) 000-0000',
    full_name: 'System Admin',
    role: 'admin',
    avatar_url: null,
    date_of_birth: '1980-01-01',
    guardian_id: null,
    consent_given: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

export function getMockProfile(role: string): Profile | null {
  return MOCK_PROFILES[role] || null
}

export function setMockUserRole(role: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('mock_user_role', role)
  }
}

export function getMockUserRole(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('mock_user_role')
  }
  return null
}

export function clearMockUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mock_user_role')
  }
}
