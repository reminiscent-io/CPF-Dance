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
import { downloadICS, generateGoogleCalendarLink, generateOutlookLink } from '@/lib/utils/calendar-export'
import { AddNoteModal } from '@/components/AddNoteModal'
import type { CreateNoteData } from '@/lib/types'

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
  has_notes?: boolean
  notes_count?: number
  studios?: {
    name: string
    address: string
  }
}

interface EnrolledStudent {
  id: string
  full_name: string
  email?: string
}

interface StudentForNotes {
  id: string
  full_name: string
}

type ViewType = 'day' | 'month'

export default function InstructorSchedulePage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  const [classes, setClasses] = useState<ClassEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarMenu, setShowCalendarMenu] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [studentsForNotes, setStudentsForNotes] = useState<StudentForNotes[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('month')

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

  const handleEventClick = async (event: ClassEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)

    // For private lessons, fetch enrolled students
    if (event.class_type === 'private') {
      await fetchEnrolledStudents(event.id)
    }
  }

  const fetchEnrolledStudents = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/enrollments`)
      if (!response.ok) throw new Error('Failed to fetch enrollments')

      const result = await response.json()
      setEnrolledStudents(result.enrollments || [])
    } catch (err: any) {
      console.error('Error fetching enrollments:', err)
      setEnrolledStudents([])
    }
  }

  const handleCreateNote = () => {
    // Convert enrolled students to the format needed for AddNoteModal
    const studentsForModal: StudentForNotes[] = enrolledStudents.map(s => ({
      id: s.id,
      full_name: s.full_name
    }))
    setStudentsForNotes(studentsForModal)
    setShowNoteModal(true)
    setShowEventModal(false)
  }

  const handleSubmitNote = async (data: CreateNoteData) => {
    if (!selectedEvent) {
      addToast('No class selected', 'error')
      return
    }

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          class_id: selectedEvent.id
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create note')
      }

      addToast('Note created successfully', 'success')
      setShowNoteModal(false)
      setShowEventModal(true)
    } catch (err: any) {
      addToast(err.message, 'error')
      setShowNoteModal(false)
    }
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

  const handleMobileMonthChange = (date: Date) => {
    setCurrentDate(date)
    handleDateChange(date)
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

  // Day view helpers
  const getClassesForDate = (date: Date) => {
    const dateStart = new Date(date)
    dateStart.setHours(0, 0, 0, 0)
    const dateEnd = new Date(date)
    dateEnd.setHours(23, 59, 59, 999)

    return classes
      .filter(cls => {
        const classDate = new Date(cls.start_time)
        return classDate >= dateStart && classDate <= dateEnd
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)

    // Fetch data for new month if we crossed a month boundary
    if (newDate.getMonth() !== currentDate.getMonth()) {
      handleDateChange(newDate)
    }
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    if (today.getMonth() !== currentDate.getMonth()) {
      handleDateChange(today)
    }
  }

  const formatDayViewDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const dayClasses = getClassesForDate(currentDate)

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
      <div className="flex flex-col">
        {/* Header */}
        <div className="hidden md:flex md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>My Schedule</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">View your upcoming classes</p>
          </div>
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewType('day')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewType('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                viewType === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>

        {error && (
          <Card className="bg-red-50 border-red-200 mb-4">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {loading && classes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* DESKTOP VIEW - Day View */}
            {viewType === 'day' && (
              <div className="hidden md:flex md:flex-col">
                {/* Day Navigation */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <button
                    onClick={() => navigateDay('prev')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {formatDayViewDate(currentDate)}
                    </h2>
                    {!isToday(currentDate) && (
                      <button
                        onClick={goToToday}
                        className="text-sm text-rose-600 hover:text-rose-700 font-medium mt-1"
                      >
                        Go to Today
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => navigateDay('next')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Day Classes List */}
                <div className="pb-8">
                  {dayClasses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">📅</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No classes scheduled</h3>
                      <p className="text-gray-600">You don't have any classes on this day.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {dayClasses.map((classItem) => {
                        const startTime = new Date(classItem.start_time)
                        const endTime = new Date(classItem.end_time)
                        const isPast = endTime < new Date()

                        return (
                          <div
                            key={classItem.id}
                            onClick={() => handleEventClick(classItem)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                              isPast ? 'opacity-60 bg-gray-50' : 'bg-white hover:border-rose-300'
                            } ${classItem.is_cancelled ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{classItem.title}</h3>
                                  {classItem.has_notes && (
                                    <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z"/>
                                      <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/>
                                    </svg>
                                  )}
                                  <Badge className={getClassTypeClassName(classItem.class_type)}>
                                    {getClassTypeLabel(classItem.class_type)}
                                  </Badge>
                                  {isPast && (
                                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Completed</span>
                                  )}
                                  {classItem.is_cancelled && (
                                    <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded">Cancelled</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {startTime.toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })} - {endTime.toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    })}
                                  </div>
                                  {classItem.location && (
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {classItem.location}
                                    </div>
                                  )}
                                  {classItem.studios?.name && (
                                    <div className="flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      {classItem.studios.name}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    {classItem.enrolled_count || 0}{classItem.max_capacity ? `/${classItem.max_capacity}` : ''} enrolled
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DESKTOP VIEW - Calendar Grid (Month View) */}
            {viewType === 'month' && (
              <div className="hidden md:block pb-8">
                <Calendar
                  events={classes}
                  onEventClick={handleEventClick}
                  onDateChange={handleDateChange}
                />
              </div>
            )}

            {/* MOBILE VIEW - Apple Calendar Style */}
            <div className="flex md:hidden flex-col flex-1 min-h-0 overflow-hidden -mx-4 sm:-mx-6">
              <MobileCalendar
                events={classes}
                currentDate={currentDate}
                onEventClick={handleEventClick}
                onMonthChange={handleMobileMonthChange}
              />
            </div>

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

            {/* Show enrolled students for private lessons */}
            {selectedEvent.class_type === 'private' && enrolledStudents.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Enrolled Student{enrolledStudents.length > 1 ? 's' : ''}</p>
                {enrolledStudents.map(student => (
                  <p key={student.id} className="text-sm text-gray-900">
                    {student.full_name} {student.email && `(${student.email})`}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {/* Create Note button for private lessons with enrolled students */}
              {selectedEvent.class_type === 'private' && enrolledStudents.length > 0 && (
                <Button
                  onClick={handleCreateNote}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  ✏️ Create Note for Student
                </Button>
              )}

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

      {/* Note Creation Modal */}
      {showNoteModal && (
        <AddNoteModal
          students={studentsForNotes}
          onClose={() => {
            setShowNoteModal(false)
            setShowEventModal(true)
          }}
          onSubmit={handleSubmitNote}
          initialStudentId={enrolledStudents.length === 1 ? enrolledStudents[0].id : undefined}
          initialClassId={selectedEvent?.id}
        />
      )}
    </PortalLayout>
  )
}
