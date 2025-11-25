'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

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
  author_name: string
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
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
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
        setRecentNotes(data.recent_notes)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
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
        day: 'numeric',
        year: 'numeric'
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
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
          <div className="grid grid-cols-2 gap-6 mb-8">
            <Card hover className="bg-gradient-to-br from-rose-50 to-white">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Upcoming Classes</p>
                    <p className="text-3xl font-bold text-rose-600">{stats?.upcoming_classes || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📅</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card hover className="bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Classes Attended</p>
                    <p className="text-3xl font-bold text-purple-600">{stats?.total_classes_attended || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">✨</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card hover className="bg-gradient-to-br from-mauve-50 to-white">
              <CardContent className="p-3 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Recent Notes</p>
                    <p className="text-3xl font-bold text-mauve-600">{stats?.recent_notes || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-mauve-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardTitle className="p-6 pb-4">Your Next Class</CardTitle>
              <CardContent className="px-6 pb-6">
                {nextClass ? (
                  <div className="bg-gradient-to-r from-rose-50 to-purple-50 rounded-lg p-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {nextClass.title}
                    </h3>
                    {nextClass.description && (
                      <p className="text-gray-600 mb-3 text-sm">{nextClass.description}</p>
                    )}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-700">
                        <span className="mr-2">📅</span>
                        <span className="font-medium">{formatDateTime(nextClass.start_time).date}</span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <span className="mr-2">⏰</span>
                        <span>{formatDateTime(nextClass.start_time).time}</span>
                      </div>
                      {nextClass.location && (
                        <div className="flex items-center text-gray-700">
                          <span className="mr-2">📍</span>
                          <span>{nextClass.studios?.name || nextClass.location}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => router.push('/dancer/classes')}
                    >
                      View All Classes
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-4">No upcoming classes scheduled</p>
                    <p className="text-sm">Check your class schedule or talk to your instructor!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardTitle className="p-6 pb-4">Quick Actions</CardTitle>
              <CardContent className="px-6 pb-6">
                <div className="space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => router.push('/dancer/request-lesson')}
                  >
                    💫 Request Private Lesson
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dancer/my-notes')}
                  >
                    📝 Add Note
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dancer/progress')}
                  >
                    📈 View Progress
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/dancer/payments')}
                  >
                    💳 Payment History
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardTitle className="p-6 pb-4">Recent Instructor Notes</CardTitle>
            <CardContent className="px-6 pb-6">
              {recentNotes.length > 0 ? (
                <div className="space-y-4">
                  {recentNotes.map((note) => (
                    <div
                      key={note.id}
                      className="border-l-4 border-rose-500 bg-gray-50 rounded-r-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          {note.title && (
                            <h4 className="font-semibold text-gray-900 mb-1">{note.title}</h4>
                          )}
                          <p className="text-sm text-gray-600">
                            {note.classes?.title && `${note.classes.title} • `}
                            {note.author_name}
                          </p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 mb-2 line-clamp-2">{note.content}</p>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag, idx) => (
                            <Badge key={idx} variant="primary" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push('/dancer/progress')}
                  >
                    View All Notes →
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-2">No instructor notes yet</p>
                  <p className="text-sm">Your instructor will share feedback and progress notes here!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PortalLayout>
  )
}
