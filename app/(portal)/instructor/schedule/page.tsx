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
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { downloadICS, generateGoogleCalendarLink, generateOutlookLink } from '@/lib/utils/calendar-export'

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
}

export default function InstructorSchedulePage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarMenu, setShowCalendarMenu] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
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

      const response = await fetch(`/api/instructor/schedule?${params.toString()}`)
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

  const getClassTypeClassName = (type: string) => {
    switch (type) {
      case 'private':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'group':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'workshop':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'master_class':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getClassesByDay = () => {
    const grouped: { [key: string]: ClassEvent[] } = {}
    classes.forEach(cls => {
      const date = new Date(cls.start_time)
      const dayKey = date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
      if (!grouped[dayKey]) grouped[dayKey] = []
      grouped[dayKey].push(cls)
    })
    return Object.entries(grouped)
      .sort(([keyA], [keyB]) => new Date(keyA).getTime() - new Date(keyB).getTime())
      .map(([key, events]) => ({
        date: new Date(key),
        events: events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      }))
  }

  const formatDateHeader = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() - 1)
    handleDateChange(newDate)
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    newDate.setMonth(newDate.getMonth() + 1)
    handleDateChange(newDate)
    setCurrentDate(newDate)
  }

  const navigateToday = () => {
    const today = new Date()
    handleDateChange(today)
    setCurrentDate(today)
  }

  const handleAddToAppleCalendar = () => {
    if (selectedEvent) {
      downloadICS(selectedEvent)
      setShowCalendarMenu(false)
    }
  }

  const handleAddToGoogleCalendar = () => {
    if (selectedEvent) {
      window.open(generateGoogleCalendarLink(selectedEvent), '_blank')
      setShowCalendarMenu(false)
    }
  }

  const handleAddToOutlook = () => {
    if (selectedEvent) {
      window.open(generateOutlookLink(selectedEvent), '_blank')
      setShowCalendarMenu(false)
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

  if (!user || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="flex flex-col h-[calc(100vh-280px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 flex-shrink-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>My Schedule</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">View and manage your upcoming classes</p>
          </div>
          {/* Desktop button - visible on sm and up */}
          <Button onClick={() => router.push('/instructor/classes')} className="hidden sm:inline-block">
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
          <>
            {/* DESKTOP VIEW - Calendar Grid */}
            <div className="hidden md:flex md:flex-col flex-1 min-h-0 overflow-hidden">
              <Calendar
                events={classes}
                onEventClick={handleEventClick}
                onDateChange={handleDateChange}
              />
            </div>

            {/* MOBILE VIEW - Agenda List */}
            <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-y-auto">
              {/* Mobile Navigation */}
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <button
                  onClick={navigatePrevious}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={navigateNext}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={navigateToday}
                className="mb-4 text-sm text-rose-600 hover:text-rose-700 font-medium"
              >
                Today
              </button>

              {/* Agenda List */}
              {getClassesByDay().length === 0 ? (
                <p className="text-center text-gray-600 py-8">No classes scheduled</p>
              ) : (
                <div className="space-y-4">
                  {getClassesByDay().map(dayGroup => (
                    <div key={dayGroup.date.toISOString()}>
                      {/* Day Header */}
                      <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                        {formatDateHeader(dayGroup.date)}
                      </h3>

                      {/* Classes for this day */}
                      <div className="space-y-2">
                        {dayGroup.events.map(event => (
                          <button
                            key={event.id}
                            onClick={() => handleEventClick(event)}
                            className="w-full text-left px-0 py-3 border-b border-gray-200 hover:bg-gray-50/50 transition-colors -mx-0"
                          >
                            <div className="flex gap-4">
                              {/* Time on left */}
                              <div className="flex-shrink-0 w-16">
                                <div className="text-sm font-semibold text-charcoal-700">
                                  {new Date(event.start_time).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </div>

                              {/* Details on right */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate" style={{ fontFamily: 'var(--font-family-display)' }}>
                                  {event.title}
                                </h4>
                                <p className="text-sm text-gray-600 truncate">
                                  {event.studios?.name || 'Studio TBA'}
                                </p>
                                <Badge className={`${getClassTypeClassName(event.class_type)} mt-1 text-xs`}>
                                  {getClassTypeLabel(event.class_type)}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Floating Action Button */}
            <button
              onClick={() => router.push('/instructor/classes')}
              className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              title="Manage Classes"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </>
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
              <Badge className={getClassTypeClassName(selectedEvent.class_type)}>
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

            <div className="space-y-3">
              <div className="relative">
                <Button
                  onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                  className="w-full"
                >
                  + Add to Calendar
                </Button>
                {showCalendarMenu && (
                  <div className="absolute bottom-full mb-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleAddToAppleCalendar}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                    >
                      📱 Apple Calendar / Outlook (download)
                    </button>
                    <button
                      onClick={handleAddToGoogleCalendar}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                    >
                      📅 Google Calendar
                    </button>
                    <button
                      onClick={handleAddToOutlook}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      📧 Microsoft Outlook
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    window.location.href = `/instructor/classes?class_id=${selectedEvent.id}`
                  }}
                  className="flex-1"
                >
                  View Class Details
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEventModal(false)
                    setShowCalendarMenu(false)
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  )
}
