'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Calendar, type ViewMode } from '@/components/Calendar'
import { getVisibleDateRange } from '@/lib/utils/calendar-range'
import { MobileCalendar } from '@/components/MobileCalendar'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  SegmentedControl,
  Spinner,
  StatusDot,
  Toolbar,
  useToast
} from '@/components/ui'
import {
  BuildingOffice2Icon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  MapPinIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import { downloadICS, generateGoogleCalendarLink, generateOutlookLink } from '@/lib/utils/calendar-export'
import { AddNoteModal } from '@/components/AddNoteModal'
import { InstructorPrivateLessonCancel } from '@/components/instructor/InstructorPrivateLessonCancel'
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
  const [calendarMode, setCalendarMode] = useState<ViewMode>('week')
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([])
  const [studentsForNotes, setStudentsForNotes] = useState<StudentForNotes[]>([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('month')

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  const fetchSchedule = useCallback(async (startDate?: Date, endDate?: Date) => {
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
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (profile?.role !== 'instructor' && profile?.role !== 'admin') return

    // Calendar grid uses the configured week/month mode; the list view
    // navigates day-by-day so we fetch the month containing currentDate.
    const fetchMode: ViewMode = viewType === 'month' ? calendarMode : 'month'
    const { start, end } = getVisibleDateRange(currentDate, fetchMode)
    fetchSchedule(start, end)
  }, [currentDate, calendarMode, viewType, fetchSchedule, authLoading, profile])

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
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
    // Class type chips collapse onto the four-family palette per DESIGN.md.
    // Private and master class earn an accent (rose for the intimate, gilt
    // for the premium); the rest stay neutral champagne.
    switch (type) {
      case 'private':
        return 'bg-ballet-pink-50 text-ballet-pink-800 border-ballet-pink-200'
      case 'master_class':
        return 'bg-gold-100 text-gold-800 border-gold-200'
      case 'group':
      case 'workshop':
      default:
        return 'bg-champagne-100 text-charcoal-700 border-champagne-200'
    }
  }

  const handleMobileMonthChange = (date: Date) => {
    setCurrentDate(date)
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
  }

  const goToToday = () => {
    setCurrentDate(new Date())
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
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4">Loading...</p>
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
        {/* Header + toolbar (desktop only; mobile keeps its full-bleed calendar) */}
        <div className="hidden md:block">
          <PageHeader title="Calendar" subtitle="View your upcoming classes" />
          <Toolbar
            filters={
              <>
                {viewType === 'day' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => navigateDay('prev')}
                      aria-label="Previous day"
                    >
                      <ChevronLeftIcon className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={goToToday}
                      disabled={isToday(currentDate)}
                    >
                      Today
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => navigateDay('next')}
                      aria-label="Next day"
                    >
                      <ChevronRightIcon className="w-5 h-5" aria-hidden="true" />
                    </Button>
                  </div>
                )}
                <SegmentedControl<ViewType>
                  aria-label="Switch calendar view"
                  options={[
                    { value: 'day', label: 'List' },
                    { value: 'month', label: 'Calendar' }
                  ]}
                  value={viewType}
                  onChange={setViewType}
                />
              </>
            }
          />
        </div>

        {error && (
          <Card className="bg-ballet-pink-50 border-ballet-pink-200 mb-4 md:mt-toolbar-gap md:mb-0">
            <p className="text-ballet-pink-800">{error}</p>
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
              <div className="mt-toolbar-gap hidden md:flex md:flex-col">
                {/* Day heading - nav lives in the toolbar above */}
                <h2 className="font-serif text-xl font-semibold text-charcoal-950 pb-4 border-b border-champagne-200">
                  {formatDayViewDate(currentDate)}
                </h2>

                {/* Day Classes List */}
                <div className="mt-4">
                  {dayClasses.length === 0 ? (
                    <div className="rounded-lg border border-champagne-200 bg-champagne-50">
                      <EmptyState
                        icon={<CalendarDaysIcon />}
                        message="No classes scheduled on this day."
                      />
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
                            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                              classItem.is_cancelled
                                ? 'border-ballet-pink-200 bg-ballet-pink-50'
                                : 'border-champagne-200 bg-champagne-50 hover:bg-champagne-100'
                            } ${isPast ? 'opacity-60' : ''}`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h3 className="font-serif text-lg font-semibold text-charcoal-950">{classItem.title}</h3>
                                  {classItem.has_notes && (
                                    <DocumentTextIcon className="w-4 h-4 text-gold-600" aria-hidden="true" />
                                  )}
                                  <Badge className={getClassTypeClassName(classItem.class_type)}>
                                    {getClassTypeLabel(classItem.class_type)}
                                  </Badge>
                                  {isPast && (
                                    <StatusDot tone="neutral" label="Completed" />
                                  )}
                                  {classItem.is_cancelled && (
                                    <StatusDot tone="attention" label="Cancelled" />
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-4 text-sm text-charcoal-500">
                                  <div className="flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" aria-hidden="true" />
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
                                      <MapPinIcon className="w-4 h-4" aria-hidden="true" />
                                      {classItem.location}
                                    </div>
                                  )}
                                  {classItem.studios?.name && (
                                    <div className="flex items-center gap-1">
                                      <BuildingOffice2Icon className="w-4 h-4" aria-hidden="true" />
                                      {classItem.studios.name}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1">
                                    <UsersIcon className="w-4 h-4" aria-hidden="true" />
                                    {classItem.enrolled_count || 0}{classItem.max_capacity ? `/${classItem.max_capacity}` : ''} enrolled
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <ChevronRightIcon className="w-5 h-5 text-charcoal-400" aria-hidden="true" />
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
              <div className="mt-toolbar-gap hidden md:block">
                <Calendar
                  events={classes}
                  currentDate={currentDate}
                  viewMode={calendarMode}
                  onEventClick={handleEventClick}
                  onDateChange={handleDateChange}
                  onViewModeChange={setCalendarMode}
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
        title={selectedEvent?.title ?? 'Class details'}
        size="lg"
      >
        {selectedEvent && (
          <div>
            {/* Status group — chips and any cancellation note read as one block */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={`border ${getClassTypeClassName(selectedEvent.class_type)}`}
                >
                  {getClassTypeLabel(selectedEvent.class_type)}
                </Badge>
                {selectedEvent.is_cancelled && !selectedEvent.cancellation_reason && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-[0.04em] uppercase bg-ballet-pink-100 text-ballet-pink-800 border border-ballet-pink-200">
                    Cancelled
                  </span>
                )}
              </div>

              {selectedEvent.is_cancelled && selectedEvent.cancellation_reason && (
                <div className="rounded-lg border border-ballet-pink-200 bg-ballet-pink-50 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ballet-pink-800 mb-1">
                    Cancelled
                  </p>
                  <p className="text-sm text-charcoal-800 leading-relaxed">
                    {selectedEvent.cancellation_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Meta — generous gap above; tight rhythm within */}
            <dl className="mt-7 space-y-3.5 text-sm">
              <ModalMetaRow label="When">
                <span className="text-charcoal-900">
                  {formatDateTime(selectedEvent.start_time)}
                  <span className="text-charcoal-400">{' – '}</span>
                  {new Date(selectedEvent.end_time).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </span>
              </ModalMetaRow>

              {(selectedEvent.studios || selectedEvent.location) && (
                <ModalMetaRow label="Where">
                  <span className="text-charcoal-900">
                    {selectedEvent.studios?.name || selectedEvent.location}
                  </span>
                  {selectedEvent.studios?.address && (
                    <span className="block text-charcoal-500 text-xs mt-0.5">
                      {selectedEvent.studios.address}
                    </span>
                  )}
                  {selectedEvent.studios?.name && selectedEvent.location && (
                    <span className="block text-charcoal-500 text-xs mt-0.5">
                      {selectedEvent.location}
                    </span>
                  )}
                </ModalMetaRow>
              )}

              <ModalMetaRow label="Enrollment">
                <span className="text-charcoal-900">
                  {selectedEvent.enrolled_count ?? 0}
                  {selectedEvent.max_capacity && (
                    <span className="text-charcoal-500">
                      {' / '}
                      {selectedEvent.max_capacity}
                    </span>
                  )}{' '}
                  <span className="text-charcoal-500">
                    {(selectedEvent.enrolled_count ?? 0) === 1 ? 'student' : 'students'}
                  </span>
                </span>
              </ModalMetaRow>
            </dl>

            {selectedEvent.description && (
              <section className="mt-7">
                <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-charcoal-500 mb-2">
                  About
                </h3>
                <p className="text-sm text-charcoal-800 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </section>
            )}

            {selectedEvent.class_type === 'private' && enrolledStudents.length > 0 && (
              <section className="mt-7">
                <h3 className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-charcoal-500 mb-2">
                  {enrolledStudents.length === 1 ? 'Student' : 'Students'}
                </h3>
                <ul className="rounded-lg border border-champagne-200 divide-y divide-champagne-200 overflow-hidden">
                  {enrolledStudents.map((student) => (
                    <li key={student.id} className="px-4 py-2.5 bg-champagne-100/60">
                      <p className="text-sm text-charcoal-900">{student.full_name}</p>
                      {student.email && (
                        <p className="text-xs text-charcoal-500 mt-0.5">{student.email}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Action stack — generous gap above; internal rhythm separates do-something / leave */}
            <div className="mt-9 space-y-3">
              {selectedEvent.class_type === 'private' && enrolledStudents.length > 0 && (
                <Button
                  onClick={handleCreateNote}
                  variant="primary"
                  className="w-full"
                >
                  Create note for{' '}
                  {enrolledStudents.length === 1
                    ? enrolledStudents[0].full_name.split(' ')[0]
                    : 'student'}
                </Button>
              )}

              <div className="relative">
                <Button
                  onClick={() => setShowCalendarMenu(!showCalendarMenu)}
                  variant="outline"
                  className="w-full"
                >
                  Add to calendar
                </Button>
                {showCalendarMenu && (
                  <div className="absolute bottom-full mb-2 w-full bg-champagne-50 border border-champagne-200 rounded-lg shadow-soft-lg z-10 overflow-hidden">
                    <button
                      onClick={handleAddToAppleCalendar}
                      className="w-full text-left px-4 py-3 min-h-11 hover:bg-champagne-100 border-b border-champagne-200 last:border-b-0 text-sm text-charcoal-800 transition-colors"
                    >
                      Apple Calendar / Outlook
                      <span className="block text-xs text-charcoal-500 mt-0.5">.ics download</span>
                    </button>
                    <button
                      onClick={handleAddToGoogleCalendar}
                      className="w-full text-left px-4 py-3 min-h-11 hover:bg-champagne-100 border-b border-champagne-200 last:border-b-0 text-sm text-charcoal-800 transition-colors"
                    >
                      Google Calendar
                    </button>
                    <button
                      onClick={handleAddToOutlook}
                      className="w-full text-left px-4 py-3 min-h-11 hover:bg-champagne-100 text-sm text-charcoal-800 transition-colors"
                    >
                      Microsoft Outlook
                    </button>
                  </div>
                )}
              </div>

              {selectedEvent.class_type === 'private' && !selectedEvent.is_cancelled && (
                <InstructorPrivateLessonCancel
                  classId={selectedEvent.id}
                  startTimeIso={selectedEvent.start_time}
                  onCancelled={() => {
                    setShowEventModal(false)
                    setShowCalendarMenu(false)
                    const now = new Date()
                    fetchSchedule(
                      new Date(now.getFullYear(), now.getMonth(), 1),
                      new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
                    )
                  }}
                />
              )}
            </div>

            {/* Navigation away — separated by hairline so it reads as exit, not action */}
            <div className="mt-5 pt-4 border-t border-champagne-200">
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/instructor/classes?class_id=${selectedEvent.id}`
                }}
                className="w-full text-center text-sm text-ballet-pink-700 hover:text-ballet-pink-800 font-medium tracking-[0.02em] py-1.5 transition-colors"
              >
                Open full class page →
              </button>
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

function ModalMetaRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  // Stacked label-above-value on narrow phones, two-column from sm+ where the
  // label can sit in its own gutter without crowding the value.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 sm:items-baseline">
      <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-charcoal-500">
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
