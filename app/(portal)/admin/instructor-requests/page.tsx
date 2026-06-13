'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Avatar,
  Badge,
  EmptyState,
  PageHeader,
  Spinner,
  StatusDot
} from '@/components/ui'
import {
  AcademicCapIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

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

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Instructor Accounts"
        subtitle="View all instructor accounts and their activity"
      />

      <div className="mt-header-gap">
        {loadingInstructors ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <p className="text-sm text-charcoal-500">
              {instructors.length} instructor{instructors.length !== 1 ? 's' : ''} registered
            </p>

            {/* Instructors Grid */}
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {instructors.map((instructor) => (
                <div
                  key={instructor.id}
                  className="flex flex-col rounded-lg border border-champagne-200 bg-champagne-50 p-5"
                >
                  {/* Header with Avatar and Status */}
                  <div className="flex items-center gap-3">
                    <Avatar name={instructor.full_name} size="lg" />
                    <div className="min-w-0">
                      <h3 className="font-serif text-lg font-semibold text-charcoal-950 truncate">
                        {instructor.full_name}
                      </h3>
                      <StatusDot tone="positive" label="Approved" />
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-charcoal-500">
                      <EnvelopeIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{instructor.email}</span>
                    </div>
                    {instructor.phone && (
                      <div className="flex items-center gap-2 text-sm text-charcoal-500">
                        <PhoneIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span>{instructor.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-charcoal-500">
                      <CalendarDaysIcon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
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
                    <p className="mt-4 text-sm text-charcoal-700 line-clamp-3">{instructor.bio}</p>
                  )}

                  {/* Specialties */}
                  {instructor.specialties && instructor.specialties.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
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
                  )}

                  {/* Stats Footer */}
                  <div className="mt-auto pt-4">
                    <div className="flex border-t border-champagne-200 pt-4">
                      <div className="pr-5">
                        <p className="font-serif text-xl font-semibold tabular-nums text-charcoal-950">
                          {instructor.student_count}
                        </p>
                        <p className="text-xs text-charcoal-500">Students</p>
                      </div>
                      <div className="border-l border-champagne-200 pl-5">
                        <p className="font-serif text-xl font-semibold tabular-nums text-charcoal-950">
                          {instructor.class_count}
                        </p>
                        <p className="text-xs text-charcoal-500">Classes</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {instructors.length === 0 && (
              <div className="mt-3 rounded-lg border border-champagne-200 bg-champagne-50">
                <EmptyState
                  icon={<AcademicCapIcon />}
                  message="No instructor accounts have been created yet."
                />
              </div>
            )}
          </>
        )}
      </div>
    </PortalLayout>
  )
}
