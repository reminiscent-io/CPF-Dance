export interface FilterableUser {
  role: string
  full_name: string
  email: string
}

export function filterUsers<T extends FilterableUser>(
  users: T[],
  searchTerm: string,
  roleFilter: string
): T[] {
  let filtered = users

  if (roleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === roleFilter)
  }

  if (searchTerm) {
    const needle = searchTerm.toLowerCase()
    filtered = filtered.filter(u =>
      u.full_name.toLowerCase().includes(needle) ||
      u.email.toLowerCase().includes(needle)
    )
  }

  return filtered
}
