'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Calendar } from '@/components/Calendar'
import { MobileCalendar } from '@/components/MobileCalendar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { DancerAddNoteModal } from '@/components/DancerAddNoteModal'
import { downloadICS, generateGoogleCalendarLink, generateOutlookLink } from '@/lib/utils/calendar-export'

interface EnrolledClass {
  id: string
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  instructor_name: string
  attendance_status?: string
  enrollment_notes?: string
  studio?: {
    id: string
    name: string
    address: string
    city: string
    state: string
  }
}

interface PersonalClass {
  id: string
  title: string
  instructor_name: string | null
  location: string | null
  start_time: string
  end_time: string | null
  notes: string | null
  is_recurring: boolean
}

interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  instructor?: {
    full_name: string
    email: string
  }
  studios?: {
    name: string
    address: string
  }
  // Extra fields for dancer view
  isPersonal?: boolean
  instructorName?: string
  attendanceStatus?: string
  enrollmentNotes?: string
  personalNotes?: string
  isRecurring?: boolean
}

export default function DancerSchedulePage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarMenu, setShowCalendarMenu] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push('/instructor')
    }
  }, [authLoading, profile, router])

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch both enrolled classes and personal classes in parallel
      const [enrolledResponse, personalResponse] = await Promise.all([
        fetch('/api/dancer/classes'),
        fetch('/api/dancer/personal-classes')
      ])

      const enrolledData = await enrolledResponse.json()
      const personalData = await personalResponse.json()

      if (!enrolledResponse.ok) {
        throw new Error(enrolledData.error || 'Failed to fetch enrolled classes')
      }

      // Transform enrolled classes to CalendarEvent format
      const enrolledEvents: CalendarEvent[] = (enrolledData.classes || []).map((c: EnrolledClass) => ({
        id: `enrolled-${c.id}`,
        title: c.title,
        description: c.description,
        location: c.location || (c.studio ? `${c.studio.name}, ${c.studio.address}` : undefined),
        start_time: c.start_time,
        end_time: c.end_time,
        class_type: c.class_type,
        is_cancelled: c.is_cancelled,
        studios: c.studio ? { name: c.studio.name, address: `${c.studio.address}, ${c.studio.city}, ${c.studio.state}` } : undefined,
        isPersonal: false,
        instructorName: c.instructor_name,
        attendanceStatus: c.attendance_status,
        enrollmentNotes: c.enrollment_notes
      }))

      // Transform personal classes to CalendarEvent format
      const personalEvents: CalendarEvent[] = (personalData.classes || []).map((c: PersonalClass) => ({
        id: `personal-${c.id}`,
        title: c.title,
        location: c.location || undefined,
        start_time: c.start_time,
        end_time: c.end_time || new Date(new Date(c.start_time).getTime() + 60 * 60 * 1000).toISOString(), // Default 1 hour
        class_type: 'personal',
        is_cancelled: false,
        isPersonal: true,
        instructorName: c.instructor_name || undefined,
        personalNotes: c.notes || undefined,
        isRecurring: c.is_recurring
      }))

      // Combine and sort by start time
      const allEvents = [...enrolledEvents, ...personalEvents].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )

      setEvents(allEvents)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user && profile) {
      fetchSchedule()
    }
  }, [authLoading, user, profile])

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
    // Data is already loaded - no need to refetch for dancers since we get all classes
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleMobileMonthChange = (date: Date) => {
    setCurrentDate(date)
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

  const getClassTypeLabel = (type: string, isPersonal?: boolean) => {
    if (isPersonal) return 'Personal'
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

  const getClassTypeClassName = (type: string, isPersonal?: boolean) => {
    if (isPersonal) return 'bg-rose-100 text-rose-800 border-rose-200'
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

  const getAttendanceStatusBadge = (status?: string) => {
    if (!status) return null
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800">Present</Badge>
      case 'absent':
        return <Badge className="bg-red-100 text-red-800">Absent</Badge>
      case 'late':
        return <Badge className="bg-yellow-100 text-yellow-800">Late</Badge>
      case 'excused':
        return <Badge className="bg-gray-100 text-gray-800">Excused</Badge>
      default:
        return null
    }
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

  const handleCreateNote = () => {
    setShowEventModal(false)
    setShowCalendarMenu(false)
    setShowNoteModal(true)
  }

  const handleNoteSubmit = async (data: {
    title: string
    content: string
    tags: string[]
    visibility: 'private' | 'shared_with_instructor'
    class_id?: string
    personal_class_id?: string
  }) => {
    const response = await fetch('/api/dancer/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create note')
    }

    addToast('Note created successfully', 'success')
    setShowNoteModal(false)
  }

  // Extract actual class ID and type from the event
  const getClassInfoFromEvent = (event: CalendarEvent | null) => {
    if (!event) return null

    // Event IDs are prefixed with "enrolled-" or "personal-"
    const isPersonal = event.id.startsWith('personal-')
    const actualId = event.id.replace(/^(enrolled-|personal-)/, '')

    return {
      id: actualId,
      title: event.title,
      type: isPersonal ? 'personal' as const : 'enrolled' as const,
      start_time: event.start_time,
      instructorName: event.instructorName
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

  if (!user || !profile || (profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian')) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="flex flex-col h-[calc(100dvh-15rem)] md:h-[calc(100dvh-11rem)]">
        {/* Header */}
        <div className="hidden md:block mb-6 flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>My Schedule</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">View your upcoming classes and personal events</p>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 mb-4 flex-shrink-0">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW - Calendar Grid */}
            <div className="hidden md:flex md:flex-col flex-1 overflow-hidden">
              <Calendar
                events={events}
                onEventClick={handleEventClick}
                onDateChange={handleDateChange}
              />
            </div>

            {/* MOBILE VIEW - Apple Calendar Style */}
            <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden -mx-4 sm:-mx-6">
              <MobileCalendar
                events={events}
                currentDate={currentDate}
                onEventClick={handleEventClick}
                onMonthChange={handleMobileMonthChange}
              />
            </div>
          </>
        )}
      </div>

      {/* Event Details Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false)
          setShowCalendarMenu(false)
        }}
        title="Class Details"
      >
        {selectedEvent && (
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {selectedEvent.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getClassTypeClassName(selectedEvent.class_type, selectedEvent.isPersonal)}>
                  {getClassTypeLabel(selectedEvent.class_type, selectedEvent.isPersonal)}
                </Badge>
                {selectedEvent.isRecurring && (
                  <Badge className="bg-indigo-100 text-indigo-800">Recurring</Badge>
                )}
                {getAttendanceStatusBadge(selectedEvent.attendanceStatus)}
              </div>
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

            {selectedEvent.instructorName && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Instructor</p>
                <p className="font-medium text-gray-900">{selectedEvent.instructorName}</p>
              </div>
            )}

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

            {selectedEvent.description && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="text-gray-900">{selectedEvent.description}</p>
              </div>
            )}

            {selectedEvent.enrollmentNotes && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                <p className="text-sm text-gray-900">{selectedEvent.enrollmentNotes}</p>
              </div>
            )}

            {selectedEvent.personalNotes && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Personal Notes</p>
                <p className="text-sm text-gray-900">{selectedEvent.personalNotes}</p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              {/* Create Note button */}
              <Button
                onClick={handleCreateNote}
                className="w-full bg-rose-600 hover:bg-rose-700"
              >
                Create Note
              </Button>

              <div className="relative">
                <Button
                  variant="outline"
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
                      Apple Calendar / Outlook (download)
                    </button>
                    <button
                      onClick={handleAddToGoogleCalendar}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0 text-sm"
                    >
                      Google Calendar
                    </button>
                    <button
                      onClick={handleAddToOutlook}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      Microsoft Outlook
                    </button>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEventModal(false)
                  setShowCalendarMenu(false)
                }}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Note Creation Modal */}
      {showNoteModal && selectedEvent && (
        <DancerAddNoteModal
          onClose={() => setShowNoteModal(false)}
          onSubmit={handleNoteSubmit}
          initialClass={getClassInfoFromEvent(selectedEvent) || undefined}
        />
      )}
    </PortalLayout>
  )
}
