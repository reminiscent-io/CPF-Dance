'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react'
import dynamic from 'next/dynamic'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import {
  UsersIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline'

const ChartSkeleton = ({ height }: { height: string }) => (
  <Skeleton variant="rectangular" className={`w-full ${height}`} />
)

const RevenueTrendChart = dynamic(
  () => import('@/components/admin/AdminCharts').then((m) => m.RevenueTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-72" /> }
)
const NotesTrendChart = dynamic(
  () => import('@/components/admin/AdminCharts').then((m) => m.NotesTrendChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-60" /> }
)
const DemographicsPieChart = dynamic(
  () => import('@/components/admin/AdminCharts').then((m) => m.DemographicsPieChart),
  { ssr: false, loading: () => <ChartSkeleton height="h-48" /> }
)

const PIE_PALETTE = ['#b06472', '#b89651', '#945563', '#dfd4c3']

interface AdminStats {
  users: {
    total: number
    by_role: Record<string, number>
    new_this_month: number
  }
  classes: {
    total: number
    enrollments: number
  }
  notes: {
    total: number
    this_month: number
    trend: Array<{ date: string; count: number }>
  }
  revenue: {
    total: number
    payment_count: number
    trend: Array<{ date: string; amount: number }>
  }
  inquiries: {
    total: number
    pending: number
    recent: Array<{ id: string; name: string; email: string; created_at: string }>
  }
  waivers: {
    total: number
    signed: number
    pending: number
    recent: Array<{ id: string; student_name: string; waiver_title: string; created_at: string }>
  }
  lesson_packs: {
    total_purchased: number
    total_used: number
    available: number
  }
}

type DeltaTone = 'increase' | 'decrease' | 'unchanged' | 'moderateIncrease'

const DeltaBadge = memo(function DeltaBadge({
  value,
  label,
  type,
}: {
  value: string
  label?: string
  type: DeltaTone
}) {
  const tone = {
    increase: 'bg-ballet-pink-100 text-ballet-pink-700',
    moderateIncrease: 'bg-champagne-100 text-champagne-800',
    decrease: 'bg-ballet-pink-100 text-ballet-pink-700',
    unchanged: 'bg-champagne-100 text-charcoal-500',
  }[type]
  const icon = {
    increase: <ArrowUpIcon className="w-3 h-3" aria-hidden="true" />,
    moderateIncrease: <ArrowUpIcon className="w-3 h-3" aria-hidden="true" />,
    decrease: <ArrowDownIcon className="w-3 h-3" aria-hidden="true" />,
    unchanged: <MinusIcon className="w-3 h-3" aria-hidden="true" />,
  }[type]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${tone}`}
    >
      {icon}
      {value}
      {label && ` ${label}`}
    </span>
  )
})

const MetricCard = memo(function MetricCard({
  title,
  value,
  delta,
  deltaType,
}: {
  title: string
  value: string | number
  delta: string
  deltaType: DeltaTone
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">
              {title}
            </p>
            <p className="font-serif text-[2.25rem] leading-none font-semibold text-charcoal-950 mt-3">
              {value}
            </p>
          </div>
          <DeltaBadge value={delta} type={deltaType} />
        </div>
      </CardContent>
    </Card>
  )
})

function MetricSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-3 w-full">
            <Skeleton variant="text" width="50%" height={12} />
            <Skeleton variant="text" width="65%" height={32} />
          </div>
          <Skeleton variant="rectangular" width={70} height={22} />
        </div>
      </CardContent>
    </Card>
  )
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

const formatTrendDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export default function AdminDashboard() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      const redirectPath =
        profile.role === 'instructor'
          ? '/instructor'
          : profile.role === 'dancer'
          ? '/dancer'
          : '/login'
      router.push(redirectPath)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (loading || !user || !profile || profile.role !== 'admin' || hasFetched.current) return
    hasFetched.current = true
    ;(async () => {
      try {
        const response = await fetch('/api/admin/stats')
        if (response.ok) {
          const data = await response.json()
          setStats(data.stats)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoadingStats(false)
      }
    })()
  }, [loading, user, profile])

  const userDemographics = useMemo(() => {
    if (!stats) return []
    return [
      { name: 'Dancers', value: stats.users.by_role.dancer || 0 },
      { name: 'Instructors', value: stats.users.by_role.instructor || 0 },
      { name: 'Guardians', value: stats.users.by_role.guardian || 0 },
      { name: 'Admins', value: stats.users.by_role.admin || 0 },
    ].filter((item) => item.value > 0)
  }, [stats])

  const notesTrendData = useMemo(
    () =>
      stats?.notes.trend.map((item) => ({
        date: formatTrendDate(item.date),
        count: item.count,
      })) ?? [],
    [stats]
  )

  const revenueTrendData = useMemo(
    () =>
      stats?.revenue.trend.map((item) => ({
        date: formatTrendDate(item.date),
        amount: item.amount,
      })) ?? [],
    [stats]
  )

  const goUsers = useCallback(() => router.push('/admin/users'), [router])
  const goInstructors = useCallback(() => router.push('/admin/instructor-requests'), [router])
  const goInquiries = useCallback(() => router.push('/admin/studio-inquiries'), [router])

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

  if (!user || !profile || profile.role !== 'admin') {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div>
            <h1 className="font-serif text-4xl font-semibold text-charcoal-950 tracking-[-0.02em]">
              Admin
            </h1>
            <p className="text-charcoal-500 mt-1">Platform overview and management</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={goUsers}>
              <UsersIcon className="w-4 h-4 mr-1" aria-hidden="true" />
              Users
            </Button>
            <Button variant="outline" size="sm" onClick={goInstructors}>
              <AcademicCapIcon className="w-4 h-4 mr-1" aria-hidden="true" />
              Instructors
            </Button>
            <Button variant="outline" size="sm" onClick={goInquiries}>
              <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" aria-hidden="true" />
              Inquiries
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingStats || !stats ? (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                title="Total users"
                value={stats.users.total}
                delta={`+${stats.users.new_this_month} this month`}
                deltaType={stats.users.new_this_month > 0 ? 'increase' : 'unchanged'}
              />
              <MetricCard
                title="Total revenue"
                value={formatCurrency(stats.revenue.total)}
                delta={`${stats.revenue.payment_count} payments`}
                deltaType="moderateIncrease"
              />
              <MetricCard
                title="Active classes"
                value={stats.classes.total}
                delta={`${stats.classes.enrollments} enrollments`}
                deltaType="moderateIncrease"
              />
              <MetricCard
                title="Total notes"
                value={stats.notes.total}
                delta={`+${stats.notes.this_month} this month`}
                deltaType={stats.notes.this_month > 0 ? 'increase' : 'unchanged'}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-baseline justify-between mb-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">
                  Revenue trend
                </p>
                <p className="text-xs text-charcoal-400">Last 30 days</p>
              </div>
              <div className="h-72">
                {loadingStats || !stats ? (
                  <ChartSkeleton height="h-full" />
                ) : (
                  <RevenueTrendChart data={revenueTrendData} formatCurrency={formatCurrency} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500 mb-4">
                User demographics
              </p>
              <div className="h-48">
                {loadingStats || !stats ? (
                  <ChartSkeleton height="h-full" />
                ) : (
                  <DemographicsPieChart data={userDemographics} />
                )}
              </div>
              <div className="mt-4 space-y-2">
                {(loadingStats || !stats ? [] : userDemographics).map((item, idx) => (
                  <div key={item.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_PALETTE[idx % PIE_PALETTE.length] }}
                        aria-hidden="true"
                      />
                      <span className="text-sm text-charcoal-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-charcoal-950 tabular-nums">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">
                Notes activity
              </p>
              <p className="text-xs text-charcoal-400">Last 30 days</p>
            </div>
            <div className="h-60">
              {loadingStats || !stats ? (
                <ChartSkeleton height="h-full" />
              ) : (
                <NotesTrendChart data={notesTrendData} />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-charcoal-950">Pending inquiries</p>
                {stats && (
                  <DeltaBadge
                    value={`${stats.inquiries.pending} pending`}
                    type={stats.inquiries.pending > 0 ? 'moderateIncrease' : 'unchanged'}
                  />
                )}
              </div>
              {loadingStats || !stats ? (
                <ListSkeleton />
              ) : stats.inquiries.recent.length > 0 ? (
                <ul className="divide-y divide-champagne-200">
                  {stats.inquiries.recent.map((inquiry) => (
                    <li key={inquiry.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-charcoal-950 truncate">{inquiry.name}</p>
                        <p className="text-xs text-charcoal-500 truncate">{inquiry.email}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={goInquiries}>
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-charcoal-500 text-sm">No pending inquiries.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-charcoal-950">Pending waivers</p>
                {stats && (
                  <DeltaBadge
                    value={`${stats.waivers.pending} pending`}
                    type={stats.waivers.pending > 0 ? 'moderateIncrease' : 'unchanged'}
                  />
                )}
              </div>
              {loadingStats || !stats ? (
                <ListSkeleton />
              ) : stats.waivers.recent.length > 0 ? (
                <ul className="divide-y divide-champagne-200">
                  {stats.waivers.recent.map((waiver) => (
                    <li key={waiver.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-charcoal-950 truncate">
                          {waiver.student_name}
                        </p>
                        <p className="text-xs text-charcoal-500 truncate">{waiver.waiver_title}</p>
                      </div>
                      <span className="text-xs text-charcoal-500 tabular-nums">
                        {new Date(waiver.created_at).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-charcoal-500 text-sm">No pending waivers.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-champagne-200 rounded-lg overflow-hidden border border-champagne-200">
          <SummaryTile
            label="Studio inquiries"
            value={stats?.inquiries.total ?? 0}
            sub={stats ? `${stats.inquiries.pending} pending` : ''}
            loading={loadingStats || !stats}
          />
          <SummaryTile
            label="Waivers"
            value={stats?.waivers.total ?? 0}
            sub={stats ? `${stats.waivers.signed} signed · ${stats.waivers.pending} pending` : ''}
            loading={loadingStats || !stats}
          />
          <SummaryTile
            label="Private lessons"
            value={stats?.lesson_packs.available ?? 0}
            sub={
              stats
                ? `${stats.lesson_packs.total_purchased} purchased · ${stats.lesson_packs.total_used} used`
                : ''
            }
            loading={loadingStats || !stats}
          />
        </div>

        {!loadingStats && !stats && (
          <div className="text-center py-12">
            <p className="text-charcoal-500">Failed to load statistics.</p>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-champagne-200">
      {[0, 1, 2].map((i) => (
        <li key={i} className="py-3 flex items-center justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <Skeleton variant="text" width="55%" height={14} />
            <Skeleton variant="text" width="35%" height={12} />
          </div>
          <Skeleton variant="rectangular" width={60} height={28} />
        </li>
      ))}
    </ul>
  )
}

function SummaryTile({
  label,
  value,
  sub,
  loading,
}: {
  label: string
  value: string | number
  sub: string
  loading: boolean
}) {
  return (
    <div className="bg-champagne-50 p-6">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">{label}</p>
      {loading ? (
        <div className="mt-3 space-y-2">
          <Skeleton variant="text" width="50%" height={28} />
          <Skeleton variant="text" width="70%" height={12} />
        </div>
      ) : (
        <>
          <p className="font-serif text-3xl font-semibold text-charcoal-950 mt-2 tabular-nums">
            {value}
          </p>
          <p className="text-sm text-charcoal-500 mt-1">{sub}</p>
        </>
      )}
    </div>
  )
}
