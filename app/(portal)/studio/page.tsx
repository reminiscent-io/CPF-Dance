'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

interface StudioStats {
  total_classes: number
  total_students: number
  pending_payments: number
  upcoming_classes: number
}

interface UpcomingClass {
  id: string
  title: string
  start_time: string
  instructor_name: string
}

export default function StudioPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<StudioStats | null>(null)
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'studio' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchDashboardData()
    }
  }, [loading, user, profile])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/studio/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
        setUpcomingClasses(data.upcoming_classes || [])
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

  if (!user || !profile || (profile.role !== 'studio' && profile.role !== 'admin')) {
    return null
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
        minute: '2-digit'
      })
    }
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Studio Dashboard
        </h1>
        <p className="text-gray-600">Welcome back, {profile.full_name}!</p>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-rose-600">
                    {stats?.total_classes || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Total Classes</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-mauve-600">
                    {stats?.total_students || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Students Enrolled</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {stats?.upcoming_classes || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Upcoming Classes</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-amber-600">
                    {stats?.pending_payments || 0}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Pending Payments</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardTitle>Quick Actions</CardTitle>
            <CardContent className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push('/studio/classes')}
                  className="justify-start"
                >
                  <span className="mr-2">📅</span>
                  View Classes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/studio/students')}
                  className="justify-start"
                >
                  <span className="mr-2">👥</span>
                  View Students
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/studio/payments')}
                  className="justify-start"
                >
                  <span className="mr-2">💳</span>
                  Submit Payment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Classes */}
          <Card>
            <CardTitle>Upcoming Classes</CardTitle>
            <CardContent className="mt-4">
              {upcomingClasses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No upcoming classes scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingClasses.slice(0, 5).map((classItem) => {
                    const { date, time } = formatDateTime(classItem.start_time)
                    return (
                      <div
                        key={classItem.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {classItem.title}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Instructor: {classItem.instructor_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{date}</p>
                          <p className="text-sm text-gray-600">{time}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {upcomingClasses.length > 5 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/studio/classes')}
                  >
                    View All Classes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PortalLayout>
  )
}
