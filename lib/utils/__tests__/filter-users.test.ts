import { describe, it, expect } from 'vitest'
import { filterUsers, type FilterableUser } from '@/lib/utils/filter-users'

const users: FilterableUser[] = [
  { role: 'instructor', full_name: 'Courtney Fenwick', email: 'courtney@cpfdance.com' },
  { role: 'dancer', full_name: 'Ella Ross', email: 'ella@example.com' },
  { role: 'dancer', full_name: 'Maya Torres', email: 'maya@example.com' },
  { role: 'admin', full_name: 'Sam Whitfield', email: 'sam@example.com' },
]

describe('filterUsers', () => {
  it('returns everyone when the role filter is "all" and there is no search', () => {
    expect(filterUsers(users, '', 'all')).toHaveLength(4)
  })

  it('narrows by role', () => {
    expect(filterUsers(users, '', 'dancer').map(u => u.full_name))
      .toEqual(['Ella Ross', 'Maya Torres'])
  })

  it('matches a search against name or email, case-insensitively', () => {
    expect(filterUsers(users, 'ELLA', 'all').map(u => u.full_name)).toEqual(['Ella Ross'])
    expect(filterUsers(users, 'cpfdance', 'all').map(u => u.full_name)).toEqual(['Courtney Fenwick'])
  })

  it('applies role and search together', () => {
    expect(filterUsers(users, 'ross', 'dancer').map(u => u.full_name)).toEqual(['Ella Ross'])
    expect(filterUsers(users, 'ross', 'admin')).toEqual([])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterUsers(users, 'nobody', 'all')).toEqual([])
  })

  it('does not mutate the input', () => {
    const copy = [...users]
    filterUsers(users, 'ella', 'dancer')
    expect(users).toEqual(copy)
  })
})
