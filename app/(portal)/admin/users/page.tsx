'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
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

export default function AdminUsersPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      const redirectPath = profile.role === 'instructor' ? '/instructor' : profile.role === 'dancer' ? '/dancer' : '/login'
      router.push(redirectPath)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && profile.role === 'admin' && !hasFetched.current) {
      hasFetched.current = true
      fetchUsers()
    }
  }, [loading, user, profile])

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

  const fetchUsers = async () => {
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
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'admin') {
    return null
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'instructor':
        return 'primary'
      case 'dancer':
        return 'secondary'
      case 'guardian':
        return 'warning'
      case 'admin':
        return 'success'
      default:
        return 'default'
    }
  }

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            All Users
          </h1>
          <p className="text-gray-600">Manage user accounts and lesson pack information</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    roleFilter === 'all'
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setRoleFilter('dancer')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    roleFilter === 'dancer'
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Dancers
                </button>
                <button
                  onClick={() => setRoleFilter('instructor')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    roleFilter === 'instructor'
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Instructors
                </button>
                <button
                  onClick={() => setRoleFilter('guardian')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    roleFilter === 'guardian'
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Guardians
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loadingUsers ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-2">
              Showing {filteredUsers.length} of {users.length} users
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((userItem) => (
                <Card key={userItem.id} hover className="flex flex-col h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                        <UsersIcon className="w-6 h-6 text-rose-500" />
                      </div>
                      <Badge variant={getRoleBadgeVariant(userItem.role)}>
                        {userItem.role.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">
                        {userItem.full_name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 truncate" title={userItem.email}>
                        {userItem.email}
                      </p>

                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                          Member Since
                        </p>
                        <p className="text-sm text-gray-700 font-medium">
                          {new Date(userItem.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Lesson Pack Info (for dancers) */}
                    {userItem.role === 'dancer' && userItem.student_id && (
                      <div className="mt-4 pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-4 rounded-b-xl">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">
                          Lesson Credits
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <p className="text-lg font-bold text-rose-600">{userItem.lessons_available}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Avail</p>
                          </div>
                          <div className="text-center border-x border-gray-200">
                            <p className="text-lg font-bold text-gray-600">{userItem.lessons_used}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Used</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-gray-400">{userItem.lessons_purchased}</p>
                            <p className="text-[10px] text-gray-500 uppercase">Total</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {userItem.role === 'dancer' && !userItem.student_id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs text-gray-500 italic">No associated student record</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-gray-600">No users found matching your search.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  )
}
