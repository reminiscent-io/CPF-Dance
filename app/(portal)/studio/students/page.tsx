'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'

interface StudentData {
  id: string
  age_group: string | null
  skill_level: string | null
  is_active: boolean
  profile: {
    full_name: string
    email: string | null
    phone: string | null
  }
  total_classes: number
}

export default function StudioStudentsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [students, setStudents] = useState<StudentData[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(true)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'studio_admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchStudents()
    }
  }, [loading, user, profile, filterActive])

  const fetchStudents = async () => {
    setLoadingStudents(true)
    try {
      const params = new URLSearchParams()
      if (filterActive !== null) {
        params.append('is_active', filterActive.toString())
      }
      const response = await fetch(`/api/studio/students?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
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

  if (!user || !profile || profile.role !== 'studio_admin') {
    return null
  }

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      student.profile.full_name.toLowerCase().includes(query) ||
      student.profile.email?.toLowerCase().includes(query) ||
      student.profile.phone?.includes(query)
    )
  })

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Students</h1>
        <p className="text-gray-600">View students enrolled at your studio</p>
      </div>

      <div className="mb-6 space-y-4">
        <Input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterActive === true ? 'primary' : 'outline'}
            onClick={() => setFilterActive(true)}
          >
            Active
          </Button>
          <Button
            variant={filterActive === false ? 'primary' : 'outline'}
            onClick={() => setFilterActive(false)}
          >
            Inactive
          </Button>
          <Button
            variant={filterActive === null ? 'primary' : 'outline'}
            onClick={() => setFilterActive(null)}
          >
            All
          </Button>
        </div>
      </div>

      {loadingStudents ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} hover>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {student.profile.full_name}
                    </h3>
                  </div>
                  <Badge variant={student.is_active ? 'success' : 'secondary'} size="sm">
                    {student.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {student.profile.email && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">✉️</span>
                      <span className="truncate">{student.profile.email}</span>
                    </div>
                  )}
                  {student.profile.phone && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📞</span>
                      <span>{student.profile.phone}</span>
                    </div>
                  )}
                  {student.skill_level && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">⭐</span>
                      <span className="capitalize">{student.skill_level}</span>
                    </div>
                  )}
                  {student.age_group && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">👶</span>
                      <span>{student.age_group}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-700">
                    <span className="mr-2">📚</span>
                    <span>{student.total_classes} classes enrolled</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery
                ? 'No Students Found'
                : filterActive === false
                ? 'No Inactive Students'
                : filterActive === true
                ? 'No Active Students'
                : 'No Students Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'There are no students enrolled at your studio yet.'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  )
}
