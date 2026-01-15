'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
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

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
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
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Notes */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
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
                  <div className="space-y-2">
                    {recentNotes.slice(0, 5).map((note) => (
                      <div
                        key={note.id}
                        onClick={() => handleNoteClick(note)}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                                note.is_personal 
                                  ? 'bg-blue-50 text-blue-600' 
                                  : 'bg-purple-50 text-purple-600'
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
                              <h3 className="font-medium text-gray-900 text-sm mb-0.5 truncate">
                                {note.title}
                              </h3>
                            )}
                            <p className="text-sm text-gray-600 line-clamp-2 leading-snug">
                              {getContentPreview(note.content, 100)}
                            </p>
                            {!note.is_personal && (
                              <p className="text-xs text-gray-400 mt-1">
                                {note.author_name}
                                {note.classes && ` · ${note.classes.title}`}
                              </p>
                            )}
                          </div>
                          <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="bg-gray-50 border-dashed">
                    <CardContent className="p-6 text-center">
                      <DocumentTextIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <h3 className="font-medium text-gray-900 mb-1 text-sm">No notes yet</h3>
                      <p className="text-xs text-gray-500 mb-3">Start capturing your dance journey</p>
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

              {/* Right Column - Upcoming */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">
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
                  <div className="space-y-2">
                    {upcomingClasses.slice(0, 5).map((classItem) => {
                      const { date, time } = formatDateTime(classItem.start_time)
                      return (
                        <div
                          key={classItem.id}
                          onClick={() => router.push('/dancer/classes')}
                          className="bg-white border border-gray-200 rounded-lg p-3 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 text-sm truncate">{classItem.title}</h3>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  {date}, {time}
                                </span>
                                {(classItem.studios?.name || classItem.location) && (
                                  <span className="flex items-center gap-1 truncate">
                                    <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{classItem.studios?.name || classItem.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="bg-gray-50 border-dashed">
                    <CardContent className="p-6 text-center">
                      <CalendarIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <h3 className="font-medium text-gray-900 mb-1 text-sm">No upcoming classes</h3>
                      <p className="text-xs text-gray-500 mb-3">Browse available classes to get started</p>
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

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div
                    onClick={() => router.push('/dancer/classes')}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <p className="text-2xl font-bold text-gray-900">{stats?.total_classes_attended || 0}</p>
                    <p className="text-xs text-gray-500">Classes Attended</p>
                  </div>

                  <div
                    onClick={() => router.push('/dancer/notes?tab=instructor')}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:border-rose-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <p className="text-2xl font-bold text-gray-900">{stats?.recent_notes || 0}</p>
                    <p className="text-xs text-gray-500">Instructor Notes</p>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  )
}
