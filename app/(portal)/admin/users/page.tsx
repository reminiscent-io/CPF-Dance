'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Badge,
  EmptyCell,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
  Spinner,
  Table,
  Toolbar
} from '@/components/ui'
import { UsersIcon } from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  student_id: string | null
  lessons_purchased: number
  lessons_used: number
  lessons_available: number
  lesson_pack_count: number
}

type RoleFilter = 'all' | 'dancer' | 'instructor' | 'guardian'

const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1)

const formatMemberSince = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

export default function AdminUsersPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      const redirectPath = profile.role === 'instructor' ? '/instructor' : profile.role === 'dancer' ? '/dancer' : '/login'
      router.push(redirectPath)
    }
  }, [loading, profile, router])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setFilteredUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    if (!loading && user && profile && profile.role === 'admin' && !hasFetched.current) {
      hasFetched.current = true
      fetchUsers()
    }
  }, [loading, user, profile, fetchUsers])

  useEffect(() => {
    let filtered = users

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'admin') {
    return null
  }

  const hasLessonInfo = (userItem: User) => userItem.role === 'dancer' && userItem.student_id

  const columns = [
    {
      key: 'full_name',
      header: 'Name',
      render: (userItem: User) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{userItem.full_name || <EmptyCell />}</span>
          {userItem.role === 'dancer' && !userItem.student_id && (
            <Badge variant="warning" size="sm">Not linked</Badge>
          )}
        </div>
      )
    },
    {
      key: 'email',
      header: 'Email',
      render: (userItem: User) => (
        <span className="text-charcoal-500">{userItem.email || <EmptyCell />}</span>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (userItem: User) => formatRole(userItem.role)
    },
    {
      key: 'created_at',
      header: 'Member since',
      render: (userItem: User) => formatMemberSince(userItem.created_at)
    },
    {
      key: 'lessons_available',
      header: 'Available',
      numeric: true,
      render: (userItem: User) =>
        hasLessonInfo(userItem) ? userItem.lessons_available : <EmptyCell />
    },
    {
      key: 'lessons_used',
      header: 'Used',
      numeric: true,
      render: (userItem: User) =>
        hasLessonInfo(userItem) ? userItem.lessons_used : <EmptyCell />
    },
    {
      key: 'lessons_purchased',
      header: 'Purchased',
      numeric: true,
      render: (userItem: User) =>
        hasLessonInfo(userItem) ? userItem.lessons_purchased : <EmptyCell />
    }
  ]

  const emptyState = (
    <EmptyState
      icon={<UsersIcon />}
      message={
        searchTerm || roleFilter !== 'all'
          ? 'No users match this view.'
          : 'No user accounts yet.'
      }
    />
  )

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="All Users"
        subtitle="Manage user accounts and lesson pack information"
      />

      <Toolbar
        search={
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search users by name or email"
          />
        }
        filters={
          <SegmentedControl<RoleFilter>
            aria-label="Filter users by role"
            options={[
              { value: 'all', label: 'All' },
              { value: 'dancer', label: 'Dancers' },
              { value: 'instructor', label: 'Instructors' },
              { value: 'guardian', label: 'Guardians' }
            ]}
            value={roleFilter}
            onChange={setRoleFilter}
          />
        }
      />

      <div className="mt-toolbar-gap">
        {!loadingUsers && (
          <p className="mb-3 text-sm text-charcoal-500">
            Showing {filteredUsers.length} of {users.length} users
          </p>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table
            data={filteredUsers}
            columns={columns}
            loading={loadingUsers}
            empty={emptyState}
          />
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {loadingUsers ? (
            <div className="rounded-lg border border-champagne-200 bg-champagne-50 p-8 text-center">
              <Spinner size="md" className="mx-auto" />
              <p className="mt-2 text-charcoal-500">Loading...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-lg border border-champagne-200 bg-champagne-50">
              {emptyState}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((userItem) => (
                <div
                  key={userItem.id}
                  className="rounded-lg border border-champagne-200 bg-champagne-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif text-lg font-semibold text-charcoal-950 truncate">
                          {userItem.full_name || '–'}
                        </h3>
                        {userItem.role === 'dancer' && !userItem.student_id && (
                          <Badge variant="warning" size="sm" className="whitespace-nowrap">
                            Not linked
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-charcoal-500 truncate" title={userItem.email}>
                        {userItem.email}
                      </p>
                      <p className="mt-2 text-sm text-charcoal-700">
                        <span className="text-charcoal-400">Member since </span>
                        {formatMemberSince(userItem.created_at)}
                      </p>
                      {hasLessonInfo(userItem) && (
                        <p className="mt-1 text-sm text-charcoal-700 tabular-nums">
                          {userItem.lessons_available} available · {userItem.lessons_used} used · {userItem.lessons_purchased} purchased
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm text-charcoal-500">
                      {formatRole(userItem.role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  )
}
