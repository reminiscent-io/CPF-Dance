'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

interface Instructor {
  id: string
  email: string
  full_name: string
  phone: string | null
  created_at: string
  bio: string | null
  specialties: string[] | null
  student_count: number
  class_count: number
}

export default function AdminInstructorRequestsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loadingInstructors, setLoadingInstructors] = useState(true)
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
      fetchInstructors()
    }
  }, [loading, user, profile])

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/admin/instructor-requests')
      if (response.ok) {
        const data = await response.json()
        setInstructors(data.instructors)
      }
    } catch (error) {
      console.error('Error fetching instructors:', error)
    } finally {
      setLoadingInstructors(false)
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

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            Instructor Accounts
          </h1>
          <p className="text-gray-600">View all instructor accounts and their activity</p>
        </div>

        {loadingInstructors ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-2">
              {instructors.length} instructor{instructors.length !== 1 ? 's' : ''} registered
            </div>

            {/* Instructors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instructors.map((instructor) => (
                <Card key={instructor.id} hover className="bg-gradient-to-br from-white to-purple-50">
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full">
                      {/* Header with Avatar Placeholder and Badge */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-rose-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-lg">
                              {instructor.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {instructor.full_name}
                            </h3>
                            <Badge variant="primary" size="sm">Instructor</Badge>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{instructor.email}</span>
                        </div>
                        {instructor.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>{instructor.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs">
                            Joined {new Date(instructor.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Bio */}
                      {instructor.bio && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 line-clamp-3">{instructor.bio}</p>
                        </div>
                      )}

                      {/* Specialties */}
                      {instructor.specialties && instructor.specialties.length > 0 && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1.5">
                            {instructor.specialties.slice(0, 3).map((specialty, idx) => (
                              <Badge key={idx} variant="default" size="sm">
                                {specialty}
                              </Badge>
                            ))}
                            {instructor.specialties.length > 3 && (
                              <Badge variant="default" size="sm">
                                +{instructor.specialties.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Stats Footer */}
                      <div className="mt-auto pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">{instructor.student_count}</p>
                            <p className="text-xs text-gray-600">Students</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-rose-600">{instructor.class_count}</p>
                            <p className="text-xs text-gray-600">Classes</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {instructors.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-6xl mb-4">🎓</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Instructors Yet
                  </h3>
                  <p className="text-gray-600">
                    No instructor accounts have been created yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  )
}
