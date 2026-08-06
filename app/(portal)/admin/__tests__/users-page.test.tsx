import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockUser = { id: 'user-1' }
const mockProfile = { id: 'user-1', role: 'admin', full_name: 'Admin' }

vi.mock('@/lib/auth/hooks', () => ({
  useUser: () => ({ user: mockUser, profile: mockProfile, loading: false })
}))

import AdminUsersPage from '@/app/(portal)/admin/users/page'

const USERS = [
  { id: 'u1', full_name: 'Ada Dancer', email: 'ada@example.com', role: 'dancer', created_at: '2026-01-01T00:00:00.000Z' }
]

describe('AdminUsersPage', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ users: USERS })
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the user list exactly once and does not refetch on re-render', async () => {
    const { rerender } = render(<AdminUsersPage />)

    // Rendered in both the desktop table and the mobile card list.
    await waitFor(() => expect(screen.getAllByText('Ada Dancer').length).toBeGreaterThan(0))

    const callsAfterLoad = fetchMock.mock.calls.filter(([url]) => url === '/api/admin/users').length
    expect(callsAfterLoad).toBe(1)

    // A parent re-render must not kick off another round trip.
    await act(async () => {
      rerender(<AdminUsersPage />)
    })

    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/admin/users')).toHaveLength(1)
  })
})
