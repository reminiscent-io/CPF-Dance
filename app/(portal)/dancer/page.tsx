'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { createSanitizedHtml } from '@/lib/utils/sanitize'
import {
  CalendarIcon,
  SparklesIcon,
  DocumentTextIcon,
  ClockIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

interface DancerStats {
  upcoming_classes: number
  total_classes_attended: number
  recent_notes: number
}

interface NextClass {
  id: string
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
  studios: {
    name: string
  } | null
}

interface RecentNote {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  created_at: string
  author_id: string
  author_name: string
  class_id: string | null
  classes: {
    title: string
  } | null
}

export default function DancerPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DancerStats | null>(null)
  const [nextClass, setNextClass] = useState<NextClass | null>(null)
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([])
  const [selectedNote, setSelectedNote] = useState<RecentNote | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchDashboardData()
    }
  }, [loading, user, profile])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dancer/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setNextClass(data.next_class)
        setRecentNotes(data.recent_notes || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleNoteClick = (note: RecentNote) => {
    setSelectedNote(note)
    setShowNoteModal(true)
  }

  const handleCloseModal = () => {
    setShowNoteModal(false)
    setSelectedNote(null)
  }

  const getTagColor = (tag: string) => {
    const colors: Record<string, any> = {
      technique: 'primary',
      performance: 'secondary',
      improvement: 'success',
      strength: 'warning',
      flexibility: 'default',
      musicality: 'primary',
      choreography: 'secondary'
    }
    return colors[tag.toLowerCase()] || 'default'
  }

  // Truncate HTML content for preview
  const getContentPreview = (html: string, maxLength: number = 200): string => {
    if (!html) return ''
    // Strip HTML tags for length calculation
    const text = html.replace(/<[^>]*>/g, '')
    // If text is short enough, return original HTML
    if (text.length <= maxLength) return html
    // Otherwise, truncate and add ellipsis
    const truncated = text.substring(0, maxLength)
    return truncated + '...'
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

  if (!user || !profile) {
    return null
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
  }

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            Welcome back, {profile.full_name}!
          </h1>
          <p className="text-gray-600">Keep dancing, keep growing, keep sparkling!</p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Section A: Next Class Hero */}
            <Card className="w-full bg-gradient-to-br from-rose-50 via-white to-purple-50 border-rose-200">
              <CardContent className="p-6">
                {nextClass ? (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-rose-600 uppercase tracking-wide mb-2">
                        Your Next Class
                      </p>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-family-display)' }}>
                        {nextClass.title}
                      </h2>
                      <div className="flex flex-wrap gap-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-5 h-5 text-rose-500" />
                          <span className="font-medium">
                            {formatDateTime(nextClass.start_time).date} at {formatDateTime(nextClass.start_time).time}
                          </span>
                        </div>
                        {(nextClass.studios?.name || nextClass.location) && (
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="w-5 h-5 text-rose-500" />
                            <span>{nextClass.studios?.name || nextClass.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => router.push('/dancer/classes')}
                        className="w-full md:w-auto"
                      >
                        View Schedule
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CalendarIcon className="w-8 h-8 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
                      Ready to dance?
                    </h2>
                    <p className="text-gray-600 mb-6">
                      You don't have any upcoming classes scheduled yet.
                    </p>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => router.push('/dancer/classes')}
                    >
                      Browse Schedule
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section B: Progress Stats - 2 Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Classes Attended Card */}
              <Card hover className="bg-gradient-to-br from-purple-50 to-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">Classes Attended</p>
                      <p className="text-4xl font-bold text-purple-600">{stats?.total_classes_attended || 0}</p>
                    </div>
                    <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
                      <SparklesIcon className="w-8 h-8 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feedback Card (formerly Recent Notes) */}
              <div
                onClick={() => router.push('/dancer/notes')}
                className="cursor-pointer"
              >
                <Card hover className="bg-gradient-to-br from-amber-50 to-white h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Feedback</p>
                        <p className="text-4xl font-bold text-amber-600">{stats?.recent_notes || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">Tap to view all</p>
                      </div>
                      <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                        <DocumentTextIcon className="w-8 h-8 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Section C: Recent Instructor Feedback */}
            {recentNotes.length > 0 && (
              <Card className="bg-gradient-to-br from-purple-50 via-white to-rose-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                      ✨ Recent Instructor Feedback
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dancer/notes')}
                    >
                      View All
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {recentNotes.map((note) => (
                      <Card
                        key={note.id}
                        hover
                        className="cursor-pointer bg-white border-l-4 border-l-purple-400"
                        onClick={() => handleNoteClick(note)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              {note.title && (
                                <div className="flex items-center gap-2 mb-1">
                                  <svg
                                    className="w-4 h-4 flex-shrink-0 text-purple-500"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                    aria-label="Instructor feedback"
                                  >
                                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                                  </svg>
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {note.title}
                                  </h3>
                                </div>
                              )}
                              <div
                                className="text-sm text-gray-700 line-clamp-2 mb-2"
                                dangerouslySetInnerHTML={createSanitizedHtml(getContentPreview(note.content))}
                              />
                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                <span>📝 {note.author_name}</span>
                                {note.classes && (
                                  <>
                                    <span>•</span>
                                    <span>{note.classes.title}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span>
                                  {new Date(note.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              {note.tags && note.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {note.tags.slice(0, 3).map((tag, idx) => (
                                    <Badge key={idx} variant={getTagColor(tag)} size="sm">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {note.tags.length > 3 && (
                                    <Badge variant="default" size="sm">
                                      +{note.tags.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Note Detail Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={handleCloseModal}
        title="Instructor Feedback"
      >
        {selectedNote && (
          <div className="space-y-4">
            {selectedNote.title && (
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedNote.title}
              </h3>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>📝 {selectedNote.author_name}</span>
              {selectedNote.classes && (
                <>
                  <span>•</span>
                  <span>{selectedNote.classes.title}</span>
                </>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="prose prose-sm max-w-none">
                <div
                  className="text-gray-700"
                  dangerouslySetInnerHTML={createSanitizedHtml(selectedNote.content)}
                />
              </div>
            </div>

            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                {selectedNote.tags.map((tag, idx) => (
                  <Badge key={idx} variant={getTagColor(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-sm text-gray-500">
              <span>
                Created: {new Date(selectedNote.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  )
}
