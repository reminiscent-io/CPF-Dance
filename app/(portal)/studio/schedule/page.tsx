'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Calendar } from '@/components/Calendar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'

interface ClassEvent {
  id: string
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  class_type: string
  max_capacity?: number
  is_cancelled: boolean
  cancellation_reason?: string
  enrolled_count?: number
  studios?: {
    name: string
    address: string
  }
  instructor?: {
    full_name: string
    email: string
  }
}

export default function StudioSchedulePage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'studio_admin' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [authLoading, profile, router])

  const fetchSchedule = async (startDate?: Date, endDate?: Date) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (startDate) {
        params.append('start_date', startDate.toISOString())
      }
      if (endDate) {
        params.append('end_date', endDate.toISOString())
      }

      const response = await fetch(`/api/studio/schedule?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch schedule')
      }

      setClasses(result.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Load initial data for the current month
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    fetchSchedule(startOfMonth, endOfMonth)
  }, [])

  const handleDateChange = (date: Date) => {
    // Load data for the month containing the selected date
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

    fetchSchedule(startOfMonth, endOfMonth)
  }

  const handleEventClick = (event: ClassEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getClassTypeLabel = (type: string) => {
    switch (type) {
      case 'private':
        return 'Private Lesson'
      case 'group':
        return 'Group Class'
      case 'workshop':
        return 'Workshop'
      case 'master_class':
        return 'Master Class'
      default:
        return type
    }
  }

  const getClassTypeColor = (type: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' => {
    switch (type) {
      case 'private':
        return 'secondary'
      case 'group':
        return 'primary'
      case 'workshop':
        return 'success'
      case 'master_class':
        return 'warning'
      default:
        return 'default'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || (profile.role !== 'studio_admin' && profile.role !== 'admin')) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="flex flex-col h-[calc(100vh-280px)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Studio Schedule</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">View all classes across all instructors</p>
          </div>
          <Button onClick={() => router.push('/studio/classes')} className="self-start sm:self-auto">
            Manage Classes
          </Button>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 mb-4 flex-shrink-0">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {loading && classes.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <Calendar
              events={classes}
              onEventClick={handleEventClick}
              onDateChange={handleDateChange}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Class Details"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedEvent.title}
              </h3>
              <Badge variant={getClassTypeColor(selectedEvent.class_type)}>
                {getClassTypeLabel(selectedEvent.class_type)}
              </Badge>
            </div>

            {selectedEvent.is_cancelled && (
              <Card className="bg-red-50 border-red-200">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-red-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-red-900">This class is cancelled</p>
                    {selectedEvent.cancellation_reason && (
                      <p className="text-red-700 text-sm mt-1">
                        {selectedEvent.cancellation_reason}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            )}

            {selectedEvent.instructor && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Instructor</p>
                <p className="font-medium text-gray-900">{selectedEvent.instructor.full_name}</p>
                <p className="text-sm text-gray-600">{selectedEvent.instructor.email}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Start Time</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(selectedEvent.start_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">End Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(selectedEvent.end_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
              </div>
            </div>

            {selectedEvent.location && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Location</p>
                <p className="font-medium text-gray-900">{selectedEvent.location}</p>
              </div>
            )}

            {selectedEvent.studios && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Studio</p>
                <p className="font-medium text-gray-900">{selectedEvent.studios.name}</p>
                {selectedEvent.studios.address && (
                  <p className="text-sm text-gray-600">{selectedEvent.studios.address}</p>
                )}
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600 mb-1">Enrollment</p>
              <p className="font-medium text-gray-900">
                {selectedEvent.enrolled_count}
                {selectedEvent.max_capacity && ` / ${selectedEvent.max_capacity}`} students
              </p>
            </div>

            {selectedEvent.description && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900">{selectedEvent.description}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  window.location.href = `/studio/classes?class_id=${selectedEvent.id}`
                }}
                className="flex-1"
              >
                View Class Details
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEventModal(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  )
}
