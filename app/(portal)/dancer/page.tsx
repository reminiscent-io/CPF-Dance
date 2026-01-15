'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
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

  const getContentPreview = (html: string, maxLength: number = 150): string => {
    if (!html) return ''
    const text = html.replace(/<[^>]*>/g, '')
    if (text.length <= maxLength) return html
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
    const tab = note.is_personal ? 'personal' : 'instructor'
    router.push(`/dancer/notes?tab=${tab}`)
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

  const instructorNotes = recentNotes.filter(n => !n.is_personal)
  const personalNotes = recentNotes.filter(n => n.is_personal)

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
            Welcome back, {profile.full_name}
          </h1>
          <p className="text-gray-500">Here's what's happening with your dance journey</p>
        </div>

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Recent Notes Section - Featured */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
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
                  {recentNotes.slice(0, 4).map((note) => (
                    <div
                      key={note.id}
                      onClick={() => handleNoteClick(note)}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          note.is_personal ? 'bg-blue-100' : 'bg-purple-100'
                        }`}>
                          {note.is_personal ? (
                            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                          ) : (
                            <SparklesIcon className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              note.is_personal 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'bg-purple-50 text-purple-700'
                            }`}>
                              {note.is_personal ? 'Personal' : 'Instructor'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(note.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          {note.title && (
                            <h3 className="font-medium text-gray-900 mb-1 truncate">
                              {note.title}
                            </h3>
                          )}
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {getContentPreview(note.content, 120).replace(/<[^>]*>/g, '')}
                          </p>
                          {!note.is_personal && (
                            <p className="text-xs text-gray-500 mt-1">
                              From {note.author_name}
                              {note.classes && ` • ${note.classes.title}`}
                            </p>
                          )}
                        </div>
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Card className="bg-gray-50 border-dashed">
                  <CardContent className="p-8 text-center">
                    <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-medium text-gray-900 mb-1">No notes yet</h3>
                    <p className="text-sm text-gray-500 mb-4">Start capturing your dance journey</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dancer/notes')}
                    >
                      Add a note
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Upcoming Classes Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font-family-display)' }}>
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
                  {upcomingClasses.slice(0, 4).map((classItem) => {
                    const { date, time } = formatDateTime(classItem.start_time)
                    return (
                      <div
                        key={classItem.id}
                        onClick={() => router.push('/dancer/classes')}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <CalendarIcon className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900">{classItem.title}</h3>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-3.5 h-3.5" />
                                  {date} at {time}
                                </span>
                                {(classItem.studios?.name || classItem.location) && (
                                  <span className="flex items-center gap-1">
                                    <MapPinIcon className="w-3.5 h-3.5" />
                                    {classItem.studios?.name || classItem.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Card className="bg-gray-50 border-dashed">
                  <CardContent className="p-8 text-center">
                    <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-medium text-gray-900 mb-1">No upcoming classes</h3>
                    <p className="text-sm text-gray-500 mb-4">Browse available classes to get started</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/dancer/classes')}
                    >
                      Browse classes
                    </Button>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Quick Stats Row */}
            <section className="grid grid-cols-2 gap-4">
              <div
                onClick={() => router.push('/dancer/classes')}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.total_classes_attended || 0}</p>
                    <p className="text-sm text-gray-500">Classes Attended</p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => router.push('/dancer/notes?tab=instructor')}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats?.recent_notes || 0}</p>
                    <p className="text-sm text-gray-500">Instructor Feedback</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </PortalLayout>
  )
}
