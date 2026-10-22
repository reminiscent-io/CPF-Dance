import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/tests/utils'
import HomePage from '@/app/page'

const useUserMock = vi.fn()
vi.mock('@/lib/auth/hooks', () => ({ useUser: () => useUserMock() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }))

describe('HomePage', () => {
  beforeEach(() => {
    useUserMock.mockReset()
  })

  it('offers sign-up and sign-in to a signed-out visitor', () => {
    useUserMock.mockReturnValue({ user: null, profile: null, loading: false })
    render(<HomePage />)

    expect(screen.getAllByRole('link', { name: 'Create your account' })[0]).toHaveAttribute('href', '/signup?role=dancer')
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute('href', '/login?portal=dancer')
    expect(screen.queryByRole('link', { name: 'Your notes' })).not.toBeInTheDocument()
  })

  it('sends a signed-in dancer back to their notes', () => {
    useUserMock.mockReturnValue({ user: { id: 'u1' }, profile: { role: 'dancer' }, loading: false })
    render(<HomePage />)

    const links = screen.getAllByRole('link', { name: 'Your notes' })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((link) => expect(link).toHaveAttribute('href', '/dancer'))
    expect(screen.queryByRole('link', { name: 'Create your account' })).not.toBeInTheDocument()
  })

  it('sends a signed-in instructor to the instructor portal', () => {
    useUserMock.mockReturnValue({ user: { id: 'u2' }, profile: { role: 'instructor' }, loading: false })
    render(<HomePage />)

    screen.getAllByRole('link', { name: 'Your portal' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/instructor')
    })
  })
})
