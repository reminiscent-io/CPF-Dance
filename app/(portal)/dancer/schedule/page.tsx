'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LockClosedIcon, EyeIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Calendar, type ViewMode } from '@/components/Calendar'
import { MobileCalendar } from '@/components/MobileCalendar'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusDot } from '@/components/ui/StatusDot'
import { useToast } from '@/components/ui/Toast'
import { DancerAddNoteModal } from '@/components/DancerAddNoteModal'
import { NoteDetailModal, type DetailNote } from '@/components/NoteDetailModal'
import { PrivateLessonActions } from '@/components/dancer/PrivateLessonActions'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { downloadICS, generateGoogleCalendarLink, generateOutlookLink } from '@/lib/utils/calendar-export'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

interface DancerNote {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  visibility: 'private' | 'shared_with_student' | 'shared_with_guardian' | 'shared_with_instructor'
  created_at: string
  updated_at: string
  author_id: string
  author_name?: string
  class_id: string | null
  personal_class_id: string | null
}

interface EnrolledClass {
  id: string
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  is_virtual?: boolean
  google_meet_url?: string | null
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
  isVirtual?: boolean
  googleMeetUrl?: string | null
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
  const [classNotes, setClassNotes] = useState<DancerNote[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCalendarMenu, setShowCalendarMenu] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [selectedNote, setSelectedNote] = useState<DetailNote | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarMode, setCalendarMode] = useState<ViewMode>('week')

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push('/instructor')
    }
  }, [authLoading, profile, router])

  const fetchSchedule = async (signal: AbortSignal) => {
      // Fetch enrolled classes, personal classes, and the dancer's notes in parallel.
      // Notes are pre-loaded so the event-details modal can show class-linked notes
      // inline without an extra round-trip on each open.
      const [enrolledResponse, personalResponse, notesResponse] = await Promise.all([
        fetch('/api/dancer/classes', { signal }),
        fetch('/api/dancer/personal-classes', { signal }),
        fetch('/api/dancer/notes', { signal })
      ])

      const enrolledData = await enrolledResponse.json()
      const personalData = await personalResponse.json()
      const notesData = notesResponse.ok ? await notesResponse.json() : { notes: [] }

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
        isVirtual: c.is_virtual,
        googleMeetUrl: c.google_meet_url,
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

      // classNotes stays local state because the page mutates it directly when
      // a dancer edits or adds a note. Seeding it here rather than deriving it
      // keeps that behaviour; this runs after an await, so it is not a
      // synchronous setState in an effect.
      setClassNotes(notesData.notes ?? [])

      return allEvents
  }

  const { data: fetchedEvents, loading, error, refetch: refetchSchedule } = useAsyncData(
    fetchSchedule,
    [],
    { enabled: !authLoading && !!user && !!profile }
  )

  const events = fetchedEvents ?? []

  const handleDateChange = (date: Date) => {
    // Dancer endpoint returns all enrolled classes, so no refetch is needed.
    setCurrentDate(date)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  // Notes whose class_id / personal_class_id matches the selected event.
  // The CalendarEvent.id is prefixed with 'enrolled-' or 'personal-'; strip it.
  const selectedEventNotes = useMemo(() => {
    if (!selectedEvent) return []
    const isPersonal = selectedEvent.id.startsWith('personal-')
    const actualId = selectedEvent.id.replace(/^(enrolled-|personal-)/, '')
    return classNotes
      .filter(n =>
        isPersonal ? n.personal_class_id === actualId : n.class_id === actualId
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [selectedEvent, classNotes])

  const formatNoteTimestamp = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const sameYear = date.getFullYear() === now.getFullYear()
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
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
      case 'competition_choreography':
        return 'Competition Choreography'
      default:
        return type
    }
  }

  const getClassTypeClassName = (type: string, isPersonal?: boolean) => {
    if (isPersonal) return 'bg-rose-100 text-rose-800 border-rose-200'
    switch (type) {
      case 'master_class':
        return 'bg-gold-100 text-gold-800 border-gold-200'
      default:
        return 'bg-champagne-100 text-charcoal-700 border-champagne-200'
    }
  }

  const getAttendanceStatusBadge = (status?: string) => {
    if (!status) return null
    switch (status) {
      case 'present':
        return <StatusDot tone="positive" label="Present" />
      case 'absent':
        return <StatusDot tone="attention" label="Absent" />
      case 'late':
        return <StatusDot tone="attention" label="Late" />
      case 'excused':
        return <StatusDot tone="neutral" label="Excused" />
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

  const handleOpenNote = (note: DancerNote) => {
    // Stack-style navigation: hide the class modal, surface the note detail
    // with a back arrow that returns the dancer to where they were.
    setSelectedNote(note as DetailNote)
    setShowEventModal(false)
    setShowCalendarMenu(false)
  }

  const handleNoteDetailBack = () => {
    setSelectedNote(null)
    if (selectedEvent) setShowEventModal(true)
  }

  const handleNoteDetailClose = () => {
    setSelectedNote(null)
  }

  const handleNoteSaved = (updated: DetailNote) => {
    setClassNotes(prev => prev.map(n => (n.id === updated.id ? { ...n, ...updated } : n)))
    setSelectedNote(updated)
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

    const result = await response.json().catch(() => null)
    if (result?.note) {
      // Optimistically prepend so the event modal shows it immediately on reopen.
      setClassNotes(prev => [result.note as DancerNote, ...prev])
    }

    addToast('Note created successfully', 'success')
    setShowNoteModal(false)
    // Return the dancer to the class details where the new note now lives.
    if (selectedEvent) setShowEventModal(true)
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
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4">Loading...</p>
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
        {/* Header — intentionally hidden on mobile so the calendar gets the full viewport */}
        <div className="hidden md:block mb-6 flex-shrink-0">
          <PageHeader
            title="My Schedule"
            subtitle="View your upcoming classes and personal events"
          />
        </div>

        {error && (
          <Card className="bg-rose-100 border-rose-200 mb-4 flex-shrink-0">
            <p className="text-rose-700">{error}</p>
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
                currentDate={currentDate}
                viewMode={calendarMode}
                onEventClick={handleEventClick}
                onDateChange={handleDateChange}
                onViewModeChange={setCalendarMode}
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
              <h3 className="text-2xl font-bold text-charcoal-950 mb-2">
                {selectedEvent.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getClassTypeClassName(selectedEvent.class_type, selectedEvent.isPersonal)}>
                  {getClassTypeLabel(selectedEvent.class_type, selectedEvent.isPersonal)}
                </Badge>
                {selectedEvent.isRecurring && (
                  <Badge className="bg-champagne-100 text-charcoal-700">Recurring</Badge>
                )}
                {selectedEvent.isVirtual && (
                  <Badge className="bg-gold-100 text-gold-800">Virtual</Badge>
                )}
                {getAttendanceStatusBadge(selectedEvent.attendanceStatus)}
              </div>
            </div>

            {selectedEvent.is_cancelled && (
              <Card className="bg-rose-100 border-rose-200">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-rose-700 mt-0.5"
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
                    <p className="font-semibold text-rose-900">This class is cancelled</p>
                  </div>
                </div>
              </Card>
            )}

            {selectedEvent.isVirtual && selectedEvent.googleMeetUrl && !selectedEvent.is_cancelled && (
              <a
                href={selectedEvent.googleMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white font-medium rounded-lg transition-colors"
              >
                <VideoCameraIcon className="w-5 h-5" />
                Join Google Meet
              </a>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-charcoal-500 mb-1">Start Time</p>
                <p className="font-medium text-charcoal-950">
                  {formatDateTime(selectedEvent.start_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-charcoal-500 mb-1">End Time</p>
                <p className="font-medium text-charcoal-950">
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
                <p className="text-sm text-charcoal-500 mb-1">Instructor</p>
                <p className="font-medium text-charcoal-950">{selectedEvent.instructorName}</p>
              </div>
            )}

            {selectedEvent.location && (
              <div>
                <p className="text-sm text-charcoal-500 mb-1">Location</p>
                <p className="font-medium text-charcoal-950">{selectedEvent.location}</p>
              </div>
            )}

            {selectedEvent.studios && (
              <div>
                <p className="text-sm text-charcoal-500 mb-1">Studio</p>
                <p className="font-medium text-charcoal-950">{selectedEvent.studios.name}</p>
                {selectedEvent.studios.address && (
                  <p className="text-sm text-charcoal-500">{selectedEvent.studios.address}</p>
                )}
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <p className="text-sm text-charcoal-500 mb-1">Description</p>
                <p className="text-charcoal-950">{selectedEvent.description}</p>
              </div>
            )}

            {selectedEvent.enrollmentNotes && (
              <div className="p-3 bg-champagne-100 border border-champagne-200 rounded-lg">
                <p className="text-sm font-medium text-charcoal-700 mb-1">Notes</p>
                <p className="text-sm text-charcoal-900">{selectedEvent.enrollmentNotes}</p>
              </div>
            )}

            {selectedEvent.personalNotes && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm font-medium text-charcoal-700 mb-1">Personal Notes</p>
                <p className="text-sm text-charcoal-900">{selectedEvent.personalNotes}</p>
              </div>
            )}

            {selectedEventNotes.length > 0 && (
              <div className="pt-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-charcoal-500 mb-2">
                  Your notes
                </p>
                <ul className="divide-y divide-champagne-200 border-t border-b border-champagne-200">
                  {selectedEventNotes.map(note => (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => handleOpenNote(note)}
                        className="w-full text-left py-3 -mx-2 px-2 rounded-md transition-colors hover:bg-champagne-100 focus:outline-none focus-visible:bg-champagne-100"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <h4
                            className="text-base font-semibold text-charcoal-950 truncate"
                            style={{ fontFamily: 'var(--font-family-display)' }}
                          >
                            {note.title?.trim() || 'Untitled note'}
                          </h4>
                          <span className="text-xs text-charcoal-500 flex-shrink-0 whitespace-nowrap">
                            {formatNoteTimestamp(note.created_at)}
                          </span>
                        </div>
                        <div
                          className="mt-1.5 text-sm text-charcoal-700 line-clamp-3 [&_p]:m-0 [&_p+p]:mt-1"
                          dangerouslySetInnerHTML={createSanitizedHtml(note.content)}
                        />
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-charcoal-500">
                          {note.visibility === 'private' ? (
                            <>
                              <LockClosedIcon className="w-3 h-3" aria-hidden="true" />
                              <span>Private</span>
                            </>
                          ) : (
                            <>
                              <EyeIcon className="w-3 h-3" aria-hidden="true" />
                              <span>Visible to your instructor</span>
                            </>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedEvent.class_type === 'private' && !selectedEvent.isPersonal && !selectedEvent.is_cancelled && (
              <PrivateLessonActions
                classId={selectedEvent.id.replace(/^enrolled-/, '')}
                startTimeIso={selectedEvent.start_time}
                onCancelled={() => {
                  setShowEventModal(false)
                  refetchSchedule()
                }}
                onRescheduleRequested={() => {
                  setShowEventModal(false)
                }}
              />
            )}

            <div className="space-y-3 pt-2">
              {/* Create Note button */}
              <Button
                onClick={handleCreateNote}
                className="w-full bg-rose-600 hover:bg-rose-700"
              >
                {selectedEventNotes.length > 0 ? 'Add another note' : 'Create note'}
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
                  <div className="absolute bottom-full mb-2 w-full bg-champagne-50 border border-champagne-300 rounded-lg shadow-lg z-10">
                    <button
                      onClick={handleAddToAppleCalendar}
                      className="w-full text-left px-4 py-2 hover:bg-champagne-100 border-b last:border-b-0 text-sm"
                    >
                      Apple Calendar / Outlook (download)
                    </button>
                    <button
                      onClick={handleAddToGoogleCalendar}
                      className="w-full text-left px-4 py-2 hover:bg-champagne-100 border-b last:border-b-0 text-sm"
                    >
                      Google Calendar
                    </button>
                    <button
                      onClick={handleAddToOutlook}
                      className="w-full text-left px-4 py-2 hover:bg-champagne-100 text-sm"
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

      {/* Note Detail Modal — drilled in from the class details modal. The
          back arrow returns the dancer to the class modal; closing dismisses
          the whole stack. */}
      {selectedNote && (
        <NoteDetailModal
          note={selectedNote}
          isOwn={!!profile && selectedNote.author_id === profile.id}
          onBack={handleNoteDetailBack}
          onClose={handleNoteDetailClose}
          onSaved={handleNoteSaved}
        />
      )}
    </PortalLayout>
  )
}
