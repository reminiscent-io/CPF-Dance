'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, Button, Badge, Spinner } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import type { DashboardStats, RecentActivity } from '@/lib/types'
import {
  CalendarIcon,
  DocumentTextIcon,
  CreditCardIcon,
  HandRaisedIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  PencilSquareIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

interface NextClass {
  id: string
  title: string
  start_time: string
  studio_name: string
}

interface TodaysClass {
  id: string
  title: string
  start_time: string
  end_time: string
  class_type: string
  studio_name: string
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
  student_name: string
  student_avatar_url: string | null
}

const ACTIVITY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  enrollment: AcademicCapIcon,
  note: DocumentTextIcon,
  payment: CreditCardIcon,
  request: HandRaisedIcon,
  cancellation: HandRaisedIcon,
  reschedule_request: CalendarIcon,
}

const ACTIVITY_LABEL: Record<string, string> = {
  enrollment: 'Enrolled',
  note: 'Note',
  payment: 'Payment',
  request: 'Request',
  cancellation: 'Cancelled',
  reschedule_request: 'Reschedule',
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    dayPeriod: 'short',
  })

const formatHeaderDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

const formatActivityTimestamp = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const stripHtml = (html: string, maxLength = 140): string => {
  if (!html) return ''
  const text = html.replace(/<[^>]*>/g, '').trim()
  return text.length <= maxLength ? text : `${text.slice(0, maxLength).trimEnd()}…`
}

export default function InstructorPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([])
  const [nextClass, setNextClass] = useState<NextClass | null>(null)
  const [todaysClasses, setTodaysClasses] = useState<TodaysClass[]>([])
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
  }, [user?.id, profile?.role])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      const data = await response.json()
      setStats(data.stats)
      setNextClass(data.next_class)
      setTodaysClasses(data.todays_classes || [])
      setRecentActivity(data.recent_activity || [])
      setRecentNotes(data.recent_notes || [])
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoadingData(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return null
  }

  const today = new Date()
  const hasSchedule = todaysClasses.length > 0
  const pendingRequests = stats?.pending_requests ?? 0
  const unpaidInvoices = stats?.unpaid_invoices ?? 0
  const activeStudents = stats?.active_students ?? 0

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-8">
        {/* Header — program-book style: serif title, restrained subline, utility chips */}
        <header className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="font-serif text-4xl font-semibold text-charcoal-950 tracking-[-0.02em]">
              Today
            </h1>
            <p className="text-charcoal-500 mt-1">{formatHeaderDate(today)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/instructor/notes?compose=1')}
            >
              <PencilSquareIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
              New note
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/instructor/classes')}
            >
              <CalendarIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
              New class
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/instructor/students')}
            >
              <UserGroupIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
              Students
            </Button>
          </div>
        </header>

        {/* Today's schedule */}
        <section>
          <SectionLabel
            label={hasSchedule ? "Today's classes" : 'Schedule'}
            action={
              stats && stats.upcoming_classes > 0
                ? {
                    label: `See all ${stats.upcoming_classes}`,
                    onClick: () => router.push('/instructor/classes'),
                  }
                : undefined
            }
          />

          <Card padding="none">
            <CardContent className="p-0">
              {loadingData ? (
                <ScheduleSkeleton />
              ) : hasSchedule ? (
                <ul className="divide-y divide-champagne-200">
                  {todaysClasses.map((classItem) => {
                    const startTime = new Date(classItem.start_time)
                    const endTime = new Date(classItem.end_time)
                    const isPast = endTime < new Date()
                    return (
                      <li
                        key={classItem.id}
                        className={`px-6 py-5 ${isPast ? 'opacity-60' : ''}`}
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-serif text-xl font-semibold text-charcoal-950">
                                {classItem.title}
                              </h3>
                              {isPast && (
                                <Badge variant="default" size="sm">
                                  Completed
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:gap-5 text-sm text-charcoal-500 mt-1.5">
                              <span className="flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4" aria-hidden="true" />
                                {formatTime(classItem.start_time)} – {formatTime(classItem.end_time)}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <BuildingOfficeIcon className="w-4 h-4" aria-hidden="true" />
                                {classItem.studio_name}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/instructor/classes?class_id=${classItem.id}`)
                            }
                          >
                            Open
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : nextClass ? (
                <div className="px-6 py-6">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500 mb-3">
                    Next up
                  </p>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-xl font-semibold text-charcoal-950">
                        {nextClass.title}
                      </h3>
                      <div className="flex flex-col sm:flex-row sm:gap-5 text-sm text-charcoal-500 mt-1.5">
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4" aria-hidden="true" />
                          {new Date(nextClass.start_time).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            dayPeriod: 'short',
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BuildingOfficeIcon className="w-4 h-4" aria-hidden="true" />
                          {nextClass.studio_name}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(`/instructor/classes?class_id=${nextClass.id}`)
                      }
                    >
                      Open
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="font-serif text-2xl text-charcoal-700">Nothing on the calendar.</p>
                  <p className="text-sm text-charcoal-500 mt-1.5">
                    Add a class when you&apos;re ready.
                  </p>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/instructor/classes')}
                    >
                      Create class
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Operational metrics — restrained, only what drives action */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-champagne-200 rounded-lg overflow-hidden border border-champagne-200">
            <MetricTile
              label="Pending requests"
              value={pendingRequests}
              caption={pendingRequests > 0 ? 'Awaiting your reply' : 'All caught up'}
              actionLabel={pendingRequests > 0 ? 'Review' : undefined}
              onAction={() => router.push('/instructor/requests')}
              loading={loadingData}
            />
            <MetricTile
              label="Unpaid invoices"
              value={unpaidInvoices}
              caption={unpaidInvoices > 0 ? 'Outstanding balances' : 'All settled'}
              actionLabel={unpaidInvoices > 0 ? 'Follow up' : undefined}
              onAction={() => router.push('/instructor/payments')}
              loading={loadingData}
            />
            <MetricTile
              label="Active students"
              value={activeStudents}
              caption={
                stats
                  ? `${stats.total_students ?? 0} on the roster`
                  : ''
              }
              actionLabel="Roster"
              onAction={() => router.push('/instructor/students')}
              loading={loadingData}
            />
          </div>
        </section>

        {/* Recent notes — student-led; Courtney's own authorship is implicit */}
        <section>
          <SectionLabel
            label="Recent notes"
            action={{
              label: 'View all',
              onClick: () => router.push('/instructor/notes'),
              icon: true,
            }}
          />

          {loadingData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <NoteCardSkeleton key={i} />
              ))}
            </div>
          ) : recentNotes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => router.push('/instructor/notes')}
                  className="text-left group"
                >
                  <Card
                    hover
                    padding="md"
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-2">
                      <p className="font-serif text-lg font-semibold text-charcoal-950 truncate">
                        {note.student_name}
                      </p>
                      <p className="text-xs text-charcoal-500 tabular-nums shrink-0">
                        {new Date(note.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {note.title && (
                      <h3 className="text-sm font-semibold text-charcoal-900 mb-1.5 line-clamp-2">
                        {note.title}
                      </h3>
                    )}

                    <p className="text-sm text-charcoal-600 line-clamp-3 leading-relaxed flex-1">
                      {stripHtml(note.content, 120)}
                    </p>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {note.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="default" size="sm">
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
                  </Card>
                </button>
              ))}
            </div>
          ) : (
            <Card padding="lg">
              <CardContent>
                <div className="text-center py-4">
                  <p className="font-serif text-2xl text-charcoal-700">No notes yet.</p>
                  <p className="text-sm text-charcoal-500 mt-1.5 mb-4">
                    Notes you leave after a lesson appear here.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/instructor/notes')}
                  >
                    Write a note
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Recent activity — single graphite vocabulary, no rainbow badges */}
        <section>
          <SectionLabel label="Recent activity" />
          <Card padding="none">
            <CardContent className="p-0">
              {loadingData ? (
                <ActivitySkeleton />
              ) : recentActivity.length === 0 ? (
                <p className="text-charcoal-500 text-sm px-6 py-6">No recent activity.</p>
              ) : (
                <ul className="divide-y divide-champagne-200">
                  {recentActivity.map((activity) => {
                    const Icon = ACTIVITY_ICON[activity.type] ?? DocumentTextIcon
                    const label = ACTIVITY_LABEL[activity.type] ?? activity.type
                    const className =
                      'w-full flex items-start gap-4 px-6 py-4 text-left transition-colors hover:bg-champagne-100'
                    const body = (
                      <>
                        <span className="shrink-0 mt-0.5 text-charcoal-400">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm text-charcoal-900">
                            {activity.description}
                          </span>
                          <span className="block text-xs text-charcoal-500 mt-1 tabular-nums">
                            {formatActivityTimestamp(activity.timestamp)}
                          </span>
                        </span>
                        <span className="shrink-0 text-[0.7rem] font-medium uppercase tracking-[0.08em] text-charcoal-500 self-center">
                          {label}
                        </span>
                      </>
                    )
                    return (
                      <li key={activity.id}>
                        {activity.link ? (
                          <button
                            type="button"
                            onClick={() => router.push(activity.link as string)}
                            className={className}
                          >
                            {body}
                          </button>
                        ) : (
                          <div className={`${className} cursor-default hover:bg-transparent`}>
                            {body}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </PortalLayout>
  )
}

function SectionLabel({
  label,
  action,
}: {
  label: string
  action?: { label: string; onClick: () => void; icon?: boolean }
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">
        {label}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-sm text-rose-700 hover:text-rose-800 font-medium inline-flex items-center gap-1 transition-colors"
        >
          {action.label}
          {action.icon && <ArrowRightIcon className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>
      )}
    </div>
  )
}

function MetricTile({
  label,
  value,
  caption,
  actionLabel,
  onAction,
  loading,
}: {
  label: string
  value: number | string
  caption: string
  actionLabel?: string
  onAction: () => void
  loading: boolean
}) {
  return (
    <div className="bg-champagne-50 px-6 py-5">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">
        {label}
      </p>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" width="65%" height={12} />
        </div>
      ) : (
        <>
          <p className="font-serif text-3xl font-semibold text-charcoal-950 mt-2 tabular-nums">
            {value}
          </p>
          <div className="flex items-center justify-between mt-1.5 gap-3">
            <p className="text-sm text-charcoal-500 truncate">{caption}</p>
            {actionLabel && (
              <button
                type="button"
                onClick={onAction}
                className="shrink-0 text-xs font-medium text-rose-700 hover:text-rose-800 inline-flex items-center gap-0.5 transition-colors"
              >
                {actionLabel}
                <ArrowRightIcon className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ScheduleSkeleton() {
  return (
    <ul className="divide-y divide-champagne-200">
      {[0, 1].map((i) => (
        <li key={i} className="px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="40%" height={20} />
              <Skeleton variant="text" width="60%" height={14} />
            </div>
            <Skeleton variant="rectangular" width={70} height={32} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function ActivitySkeleton() {
  return (
    <ul className="divide-y divide-champagne-200">
      {[0, 1, 2, 3].map((i) => (
        <li key={i} className="px-6 py-4 flex items-start gap-4">
          <Skeleton variant="circular" width={20} height={20} />
          <div className="flex-1 space-y-1.5">
            <Skeleton variant="text" width="75%" height={14} />
            <Skeleton variant="text" width="30%" height={12} />
          </div>
          <Skeleton variant="rectangular" width={64} height={14} />
        </li>
      ))}
    </ul>
  )
}

function NoteCardSkeleton() {
  return (
    <Card padding="md">
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <Skeleton variant="text" width="50%" height={20} />
          <Skeleton variant="text" width={40} height={12} />
        </div>
        <Skeleton variant="text" width="70%" height={14} />
        <div className="space-y-1.5">
          <Skeleton variant="text" width="100%" height={12} />
          <Skeleton variant="text" width="92%" height={12} />
          <Skeleton variant="text" width="78%" height={12} />
        </div>
      </div>
    </Card>
  )
}
