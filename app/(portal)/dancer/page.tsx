'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { createSanitizedHtml } from '@/lib/utils/sanitize'
import {
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  MapPinIcon,
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface DancerStats {
  upcoming_classes: number
  total_classes_attended: number
  recent_notes: number
}

interface UpcomingClass {
  id: string
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
  class_type: string
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
  author_avatar_url: string | null
  is_personal: boolean
  class_id: string | null
  classes: {
    title: string
  } | null
}

export default function DancerPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DancerStats | null>(null)
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [viewingNote, setViewingNote] = useState<RecentNote | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
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
        setUpcomingClasses(data.upcoming_classes || [])
        setRecentNotes(data.recent_notes || [])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const getContentPreview = (html: string, maxLength: number = 150): string => {
    if (!html) return ''
    const text = html.replace(/<[^>]*>/g, '')
    if (text.length <= maxLength) return text
    const truncated = text.substring(0, maxLength)
    return truncated + '...'
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    }
  }

  const handleNoteClick = (note: RecentNote) => {
    setViewingNote(note)
    setShowViewModal(true)
  }

  const handleCloseViewModal = () => {
    setShowViewModal(false)
    setViewingNote(null)
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

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
            Welcome back, {profile.full_name}
          </h1>
          <p className="text-gray-600 text-base md:text-lg">Here's what's happening with your dance journey</p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Notes */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                    Recent Notes
                  </h2>
                  <button
                    onClick={() => router.push('/dancer/notes')}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                  >
                    View all
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>

                {recentNotes.length > 0 ? (
                  <div className="space-y-3">
                    {recentNotes.map((note) => (
                      <Card
                        key={note.id}
                        className="hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleNoteClick(note)}
                      >
                        <CardContent className="p-4">
                          {/* Header: Avatar + Author + Date */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={note.author_avatar_url}
                                name={note.author_name}
                                size="md"
                              />
                              <div>
                                <div className="font-medium text-gray-900 text-sm">
                                  {note.author_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(note.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                            {/* Status badge */}
                            <Badge
                              variant={note.is_personal ? 'default' : 'success'}
                              size="sm"
                            >
                              {note.is_personal ? 'Personal' : 'Shared'}
                            </Badge>
                          </div>

                          {/* Title */}
                          {note.title && (
                            <h3 className="font-semibold text-base text-gray-900 mb-2">
                              {note.title}
                            </h3>
                          )}

                          {/* Content preview */}
                          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                            {getContentPreview(note.content, 120)}
                          </p>

                          {/* Class info */}
                          {note.classes && (
                            <p className="text-xs text-gray-400 mt-2">
                              {note.classes.title}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-50 border-dashed">
                    <CardContent className="p-6 text-center">
                      <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="font-medium text-gray-900 mb-1 text-base">No notes yet</h3>
                      <p className="text-sm text-gray-500 mb-4">Start capturing your dance journey</p>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dancer/notes')}
                      >
                        Add a note
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </section>

              {/* Right Column - Upcoming */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl md:text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                    Upcoming Classes
                  </h2>
                  <button
                    onClick={() => router.push('/dancer/classes')}
                    className="text-sm text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                  >
                    View all
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>

                {upcomingClasses.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingClasses.slice(0, 5).map((classItem) => {
                      const { date, time } = formatDateTime(classItem.start_time)
                      return (
                        <Card
                          key={classItem.id}
                          className="hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
                          onClick={() => router.push('/dancer/classes')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-base truncate">{classItem.title}</h3>
                                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <ClockIcon className="w-4 h-4" />
                                    {date}, {time}
                                  </span>
                                  {(classItem.studios?.name || classItem.location) && (
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate">{classItem.studios?.name || classItem.location}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRightIcon className="w-5 h-5 text-gray-300 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="bg-gray-50 border-dashed">
                    <CardContent className="p-6 text-center">
                      <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="font-medium text-gray-900 mb-1 text-base">No upcoming classes</h3>
                      <p className="text-sm text-gray-500 mb-4">Browse available classes to get started</p>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dancer/classes')}
                      >
                        Browse classes
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Card
                    className="hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push('/dancer/classes')}
                  >
                    <CardContent className="p-4">
                      <p className="text-3xl font-bold text-gray-900">{stats?.total_classes_attended || 0}</p>
                      <p className="text-sm text-gray-500">Classes Attended</p>
                    </CardContent>
                  </Card>

                  <Card
                    className="hover:border-rose-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => router.push('/dancer/notes?tab=instructor')}
                  >
                    <CardContent className="p-4">
                      <p className="text-3xl font-bold text-gray-900">{stats?.recent_notes || 0}</p>
                      <p className="text-sm text-gray-500">Instructor Notes</p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      {/* Note View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
        title={viewingNote?.is_personal ? 'Personal Note' : 'Instructor Feedback'}
      >
        {viewingNote && (
          <div className="space-y-4">
            {viewingNote.title && (
              <h3 className="text-2xl font-bold text-gray-900">
                {viewingNote.title}
              </h3>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{viewingNote.is_personal ? '📝' : '🎓'} {viewingNote.author_name}</span>
            </div>

            {viewingNote.tags && viewingNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 py-2">
                {viewingNote.tags.map((tag, idx) => (
                  <Badge key={idx} variant={getTagColor(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {viewingNote.classes && (
              <div className="text-sm text-gray-500">
                {viewingNote.classes.title}
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="prose prose-sm max-w-none">
                <div
                  className="text-gray-700 text-base leading-relaxed"
                  dangerouslySetInnerHTML={createSanitizedHtml(viewingNote.content)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-sm text-gray-500">
              <span>
                {new Date(viewingNote.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => router.push(`/dancer/notes?tab=${viewingNote.is_personal ? 'personal' : 'instructor'}`)}>
                View All Notes
              </Button>
              <Button onClick={handleCloseViewModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  )
}
