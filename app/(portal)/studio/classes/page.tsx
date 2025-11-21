'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'

interface ClassData {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  instructor_name: string
  max_capacity: number | null
  enrolled_count: number
}

interface DetailedClassData {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  cancellation_reason: string | null
  max_capacity: number | null
  pricing_model: string
  base_cost: number | null
  cost_per_person: number | null
  cost_per_hour: number | null
  tiered_base_students: number | null
  tiered_additional_cost: number | null
  price: number | null
  instructor: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
  } | null
  studio: {
    name: string
    city: string | null
    state: string | null
  } | null
  enrollments: Array<{
    id: string
    attendance_status: string | null
    enrolled_at: string
    student: {
      id: string
      full_name: string
      email: string | null
      phone: string | null
    }
  }>
}

type FilterType = 'all' | 'upcoming' | 'past'

export default function StudioClassesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [filter, setFilter] = useState<FilterType>('upcoming')
  const [selectedClass, setSelectedClass] = useState<DetailedClassData | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'studio' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchClasses()
    }
  }, [loading, user, profile])

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/studio/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleViewClass = async (classId: string) => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`/api/studio/classes/${classId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedClass(data.class)
      } else {
        console.error('Error fetching class details')
      }
    } catch (error) {
      console.error('Error fetching class details:', error)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleCloseModal = () => {
    setSelectedClass(null)
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

  if (!user || !profile || profile.role !== 'studio' && profile.role !== 'admin') {
    return null
  }

  const now = new Date()
  const filteredClasses = classes.filter((cls) => {
    const classDate = new Date(cls.start_time)
    if (filter === 'upcoming') return classDate >= now && !cls.is_cancelled
    if (filter === 'past') return classDate < now
    return true
  })

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getClassTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      group: 'bg-blue-100 text-blue-800',
      private: 'bg-purple-100 text-purple-800',
      workshop: 'bg-green-100 text-green-800',
      master_class: 'bg-rose-100 text-rose-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Classes</h1>
        <p className="text-gray-600">View all classes at your studio</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filter === 'upcoming' ? 'primary' : 'outline'}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'past' ? 'primary' : 'outline'}
          onClick={() => setFilter('past')}
        >
          Past
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {loadingClasses ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const { date, time } = formatDateTime(cls.start_time)
            const isPast = new Date(cls.start_time) < now

            return (
              <Card
                key={cls.id}
                hover
                className="flex flex-col cursor-pointer"
                onClick={() => handleViewClass(cls.id)}
              >
                <CardContent className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {cls.title}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getClassTypeColor(
                          cls.class_type
                        )}`}
                      >
                        {cls.class_type.replace('_', ' ')}
                      </span>
                    </div>
                    {cls.is_cancelled && (
                      <Badge variant="danger" size="sm">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  {cls.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {cls.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📅</span>
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">⏰</span>
                      <span>{time}</span>
                    </div>
                    {cls.location && (
                      <div className="flex items-center text-gray-700">
                        <span className="mr-2">📍</span>
                        <span>{cls.location}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">👤</span>
                      <span>Instructor: {cls.instructor_name}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">👥</span>
                      <span>
                        Enrolled: {cls.enrolled_count}
                        {cls.max_capacity && ` / ${cls.max_capacity}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'upcoming' && 'No Upcoming Classes'}
              {filter === 'past' && 'No Past Classes'}
              {filter === 'all' && 'No Classes Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'upcoming' &&
                'There are no upcoming classes scheduled at your studio.'}
              {filter === 'past' && 'There are no past classes to display.'}
              {filter === 'all' &&
                'No classes have been scheduled at your studio yet.'}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View All Classes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Class Details Modal */}
      <Modal
        isOpen={selectedClass !== null}
        onClose={handleCloseModal}
        title={selectedClass?.title || 'Class Details'}
        size="xl"
      >
        {loadingDetails ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : selectedClass ? (
          <div className="divide-y divide-gray-200">
            {/* Class Info */}
            <div className="pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Class Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <p className="text-gray-900 capitalize">{selectedClass.class_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div>
                    {selectedClass.is_cancelled ? (
                      <Badge variant="danger">Cancelled</Badge>
                    ) : new Date(selectedClass.start_time) < now ? (
                      <Badge variant="secondary">Past</Badge>
                    ) : (
                      <Badge variant="success">Upcoming</Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Time</label>
                  <p className="text-gray-900">
                    {formatDateTime(selectedClass.start_time).date}<br />
                    {formatDateTime(selectedClass.start_time).time}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Time</label>
                  <p className="text-gray-900">
                    {formatDateTime(selectedClass.end_time).time}
                  </p>
                </div>
                {selectedClass.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <p className="text-gray-900">{selectedClass.location}</p>
                  </div>
                )}
                {selectedClass.max_capacity && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Max Capacity</label>
                    <p className="text-gray-900">{selectedClass.max_capacity} students</p>
                  </div>
                )}
              </div>
              {selectedClass.description && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-gray-900 mt-1">{selectedClass.description}</p>
                </div>
              )}
              {selectedClass.is_cancelled && selectedClass.cancellation_reason && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <label className="text-sm font-medium text-red-800">Cancellation Reason</label>
                  <p className="text-red-900 mt-1">{selectedClass.cancellation_reason}</p>
                </div>
              )}
            </div>

            {/* Instructor Info */}
            {selectedClass.instructor && (
              <div className="py-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900">{selectedClass.instructor.full_name}</p>
                  </div>
                  {selectedClass.instructor.email && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <p className="text-gray-900">{selectedClass.instructor.email}</p>
                    </div>
                  )}
                  {selectedClass.instructor.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phone</label>
                      <p className="text-gray-900">{selectedClass.instructor.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Studio Info */}
            {selectedClass.studio && (
              <div className="py-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Studio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900">{selectedClass.studio.name}</p>
                  </div>
                  {(selectedClass.studio.city || selectedClass.studio.state) && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Location</label>
                      <p className="text-gray-900">
                        {selectedClass.studio.city}
                        {selectedClass.studio.city && selectedClass.studio.state && ', '}
                        {selectedClass.studio.state}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing Info */}
            <div className="py-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Pricing Model</label>
                  <p className="text-gray-900 capitalize">
                    {selectedClass.pricing_model?.replace('_', ' ') || 'Not specified'}
                  </p>
                </div>
                {selectedClass.pricing_model === 'per_person' && selectedClass.cost_per_person && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cost per Person</label>
                    <p className="text-gray-900">${selectedClass.cost_per_person}</p>
                  </div>
                )}
                {selectedClass.pricing_model === 'per_class' && selectedClass.base_cost && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cost per Class</label>
                    <p className="text-gray-900">${selectedClass.base_cost}</p>
                  </div>
                )}
                {selectedClass.pricing_model === 'per_hour' && selectedClass.cost_per_hour && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cost per Hour</label>
                    <p className="text-gray-900">${selectedClass.cost_per_hour}</p>
                  </div>
                )}
                {selectedClass.pricing_model === 'tiered' && (
                  <>
                    {selectedClass.base_cost && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Base Cost</label>
                        <p className="text-gray-900">${selectedClass.base_cost}</p>
                      </div>
                    )}
                    {selectedClass.tiered_base_students && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Base Students</label>
                        <p className="text-gray-900">{selectedClass.tiered_base_students}</p>
                      </div>
                    )}
                    {selectedClass.tiered_additional_cost && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Additional Cost per Student</label>
                        <p className="text-gray-900">${selectedClass.tiered_additional_cost}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Enrolled Students */}
            <div className="pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Enrolled Students ({selectedClass.enrollments.length})
              </h3>
              {selectedClass.enrollments.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedClass.enrollments.map((enrollment) => (
                    <Card key={enrollment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {enrollment.student.full_name}
                            </p>
                            <div className="text-sm text-gray-600 space-x-2">
                              {enrollment.student.email && (
                                <span>{enrollment.student.email}</span>
                              )}
                              {enrollment.student.phone && (
                                <span>• {enrollment.student.phone}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm">
                            {enrollment.attendance_status && (
                              <Badge
                                variant={
                                  enrollment.attendance_status === 'present'
                                    ? 'success'
                                    : enrollment.attendance_status === 'absent'
                                    ? 'danger'
                                    : 'secondary'
                                }
                                size="sm"
                              >
                                {enrollment.attendance_status}
                              </Badge>
                            )}
                            <p className="text-gray-600 mt-1">
                              Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No students enrolled yet</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </PortalLayout>
  )
}
