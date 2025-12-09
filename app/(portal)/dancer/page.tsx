'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
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

export default function DancerPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DancerStats | null>(null)
  const [nextClass, setNextClass] = useState<NextClass | null>(null)
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
                onClick={() => router.push('/dancer/my-notes')}
                className="cursor-pointer"
              >
                <Card hover className="bg-gradient-to-br from-amber-50 to-white h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">Feedback</p>
                        <p className="text-4xl font-bold text-amber-600">{stats?.recent_notes || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">Tap to view history</p>
                      </div>
                      <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                        <DocumentTextIcon className="w-8 h-8 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  )
}
