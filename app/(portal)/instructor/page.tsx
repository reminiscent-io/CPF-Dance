'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent, Button, Badge, Spinner } from '@/components/ui'
import type { DashboardStats, RecentActivity } from '@/lib/types'
import {
  UserGroupIcon,
  CalendarIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  CreditCardIcon,
  ClipboardDocumentCheckIcon,
  HandRaisedIcon
} from '@heroicons/react/24/outline'

interface NextClass {
  id: string
  title: string
  start_time: string
  studio_name: string
}

export default function InstructorPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [nextClass, setNextClass] = useState<NextClass | null>(null)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (user && (profile?.role === 'instructor' || profile?.role === 'admin')) {
      fetchDashboardData()
    }
  }, [user, profile])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      
      const data = await response.json()
      setStats(data.stats)
      setNextClass(data.next_class)
      setRecentActivity(data.recent_activity || [])
    } catch (error) {
      console.error('Error fetching dashboard:', error)
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

  if (!user || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
          Instructor Dashboard
        </h1>
        <p className="text-gray-600">Welcome back, {profile.full_name}!</p>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Next Class Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-charcoal-900" style={{ fontFamily: 'var(--font-family-display)' }}>
                Next Class
              </h2>
              {stats && stats.upcoming_classes > 0 && (
                <button
                  onClick={() => router.push('/instructor/classes')}
                  className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                >
                  See all {stats.upcoming_classes}
                </button>
              )}
            </div>
            
            {nextClass ? (
              <div className="pb-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-charcoal-900 mb-2">{nextClass.title}</h3>
                    <div className="flex flex-col sm:flex-row sm:gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-charcoal-600" />
                        {new Date(nextClass.start_time).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          dayPeriod: 'short'
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-charcoal-600" />
                        {nextClass.studio_name}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/instructor/classes/${nextClass.id}`)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="pb-6 border-b border-gray-200 text-center py-8 text-gray-600">
                <p>No upcoming classes scheduled</p>
                <button
                  onClick={() => router.push('/instructor/classes')}
                  className="mt-3 text-rose-600 hover:text-rose-700 font-medium text-sm"
                >
                  Create a class
                </button>
              </div>
            )}
          </div>

          {/* Stats Section - Magazine Layout */}
          <div className="space-y-0 mb-8">
            {/* Total Students */}
            <div
              onClick={() => router.push('/instructor/students')}
              className="w-full text-left py-6 px-2 border-b border-gray-200 hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-2xl md:text-3xl font-bold text-charcoal-700 mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {stats?.total_students || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Students</div>
                  <div className="text-xs text-gray-500">
                    {stats?.active_students || 0} active
                  </div>
                </div>
                <UserGroupIcon className="w-8 h-8 text-charcoal-400 flex-shrink-0 ml-4" />
              </div>
            </div>

            {/* Pending Requests */}
            <div
              onClick={() => router.push('/instructor/requests')}
              className="w-full text-left py-6 px-2 border-b border-gray-200 hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-2xl md:text-3xl font-bold text-charcoal-700 mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {stats?.pending_requests || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Pending Requests</div>
                  {(stats?.pending_requests || 0) > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push('/instructor/requests')
                      }}
                      className="text-xs px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                    >
                      Review
                    </button>
                  )}
                </div>
                <HandRaisedIcon className="w-8 h-8 text-charcoal-400 flex-shrink-0 ml-4" />
              </div>
            </div>

            {/* Unpaid Invoices */}
            <div
              onClick={() => router.push('/instructor/payments')}
              className="w-full text-left py-6 px-2 hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-2xl md:text-3xl font-bold text-charcoal-700 mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
                    {stats?.unpaid_invoices || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Unpaid Invoices</div>
                  {(stats?.unpaid_invoices || 0) > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push('/instructor/payments')
                      }}
                      className="text-xs px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded transition-colors"
                    >
                      Follow up
                    </button>
                  )}
                </div>
                <CreditCardIcon className="w-8 h-8 text-charcoal-400 flex-shrink-0 ml-4" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardTitle>Quick Actions</CardTitle>
              <CardContent className="mt-4 space-y-3">
                <Button 
                  className="w-full" 
                  onClick={() => router.push('/instructor/students')}
                >
                  + Add New Student
                </Button>
                <Button 
                  className="w-full" 
                  variant="secondary"
                  onClick={() => router.push('/instructor/classes')}
                >
                  + Create Class
                </Button>
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => router.push('/instructor/notes')}
                >
                  + Add Note
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle>Recent Activity</CardTitle>
              <CardContent className="mt-4">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-600 text-sm">No recent activity</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentActivity.map((activity) => {
                      const activityIcons: Record<string, React.ReactNode> = {
                        enrollment: <AcademicCapIcon className="w-6 h-6 text-blue-600" />,
                        note: <DocumentTextIcon className="w-6 h-6 text-purple-600" />,
                        payment: <CreditCardIcon className="w-6 h-6 text-green-600" />,
                        request: <HandRaisedIcon className="w-6 h-6 text-yellow-600" />
                      }

                      const activityColors = {
                        enrollment: 'bg-blue-100 text-blue-800',
                        note: 'bg-purple-100 text-purple-800',
                        payment: 'bg-green-100 text-green-800',
                        request: 'bg-yellow-100 text-yellow-800'
                      }

                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">{activityIcons[activity.type]}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{activity.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(activity.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <Badge 
                            variant="default" 
                            size="sm"
                            className={activityColors[activity.type]}
                          >
                            {activity.type}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardTitle>Navigation</CardTitle>
              <CardContent className="mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push('/instructor/students')}
                    className="p-4 bg-rose-50 hover:bg-rose-100 rounded-lg text-left transition-colors"
                  >
                    <UserGroupIcon className="w-8 h-8 text-rose-600 mb-2" />
                    <div className="font-semibold text-gray-900">Students</div>
                    <div className="text-xs text-gray-600">Manage roster</div>
                  </button>

                  <button
                    onClick={() => router.push('/instructor/classes')}
                    className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
                  >
                    <CalendarIcon className="w-8 h-8 text-blue-600 mb-2" />
                    <div className="font-semibold text-gray-900">Classes</div>
                    <div className="text-xs text-gray-600">View schedule</div>
                  </button>

                  <button
                    onClick={() => router.push('/instructor/notes')}
                    className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
                  >
                    <DocumentTextIcon className="w-8 h-8 text-purple-600 mb-2" />
                    <div className="font-semibold text-gray-900">Notes</div>
                    <div className="text-xs text-gray-600">Track progress</div>
                  </button>

                  <button
                    onClick={() => router.push('/instructor/studios')}
                    className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
                  >
                    <BuildingOfficeIcon className="w-8 h-8 text-green-600 mb-2" />
                    <div className="font-semibold text-gray-900">Studios</div>
                    <div className="text-xs text-gray-600">Manage locations</div>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardTitle>Getting Started</CardTitle>
              <CardContent className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Add Your Students</p>
                      <p className="text-sm text-gray-600">Create student profiles with contact info and skill levels</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Set Up Studios</p>
                      <p className="text-sm text-gray-600">Add the studios where you teach</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Schedule Classes</p>
                      <p className="text-sm text-gray-600">Create classes and manage enrollments</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-rose-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Track Progress</p>
                      <p className="text-sm text-gray-600">Add notes to monitor student development</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PortalLayout>
  )
}
