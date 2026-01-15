'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import {
  UsersIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

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

const COLORS = ['#f43f5e', '#8b5cf6', '#f59e0b', '#3b82f6']

function DeltaBadge({ value, label, type }: { value: string; label?: string; type: 'increase' | 'decrease' | 'unchanged' | 'moderateIncrease' }) {
  const colors = {
    increase: 'bg-emerald-100 text-emerald-700',
    moderateIncrease: 'bg-emerald-100 text-emerald-700',
    decrease: 'bg-red-100 text-red-700',
    unchanged: 'bg-gray-100 text-gray-600'
  }

  const icons = {
    increase: <ArrowUpIcon className="w-3 h-3" />,
    moderateIncrease: <ArrowUpIcon className="w-3 h-3" />,
    decrease: <ArrowDownIcon className="w-3 h-3" />,
    unchanged: <MinusIcon className="w-3 h-3" />
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
      {icons[type]}
      {value}
      {label && ` ${label}`}
    </span>
  )
}

function MetricCard({ 
  title, 
  value, 
  delta, 
  deltaType, 
  color 
}: { 
  title: string
  value: string | number
  delta: string
  deltaType: 'increase' | 'decrease' | 'unchanged' | 'moderateIncrease'
  color: 'blue' | 'emerald' | 'violet' | 'amber'
}) {
  const borderColors = {
    blue: 'border-t-blue-500',
    emerald: 'border-t-emerald-500',
    violet: 'border-t-violet-500',
    amber: 'border-t-amber-500'
  }

  return (
    <Card className={`border-t-4 ${borderColors[color]}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <DeltaBadge value={delta} type={deltaType} />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      const redirectPath = profile.role === 'instructor' ? '/instructor' : profile.role === 'dancer' ? '/dancer' : '/login'
      router.push(redirectPath)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && profile.role === 'admin' && !hasFetched.current) {
      hasFetched.current = true
      fetchStats()
    }
  }, [loading, user, profile])

  const fetchStats = async () => {
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

  if (!user || !profile || profile.role !== 'admin') {
    return null
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const userDemographics = stats ? [
    { name: 'Dancers', value: stats.users.by_role.dancer || 0 },
    { name: 'Instructors', value: stats.users.by_role.instructor || 0 },
    { name: 'Guardians', value: stats.users.by_role.guardian || 0 },
    { name: 'Admins', value: stats.users.by_role.admin || 0 }
  ].filter(item => item.value > 0) : []

  const notesTrendData = stats?.notes.trend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count
  })) || []

  const revenueTrendData = stats?.revenue.trend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: item.amount
  })) || []

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Platform overview and management</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/users')}>
              <UsersIcon className="w-4 h-4 mr-1" />
              Users
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/instructor-requests')}>
              <AcademicCapIcon className="w-4 h-4 mr-1" />
              Instructors
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/studio-inquiries')}>
              <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" />
              Inquiries
            </Button>
          </div>
        </div>

        {loadingStats ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Users"
                value={stats.users.total}
                delta={`+${stats.users.new_this_month} this month`}
                deltaType={stats.users.new_this_month > 0 ? 'increase' : 'unchanged'}
                color="blue"
              />
              <MetricCard
                title="Total Revenue"
                value={formatCurrency(stats.revenue.total)}
                delta={`${stats.revenue.payment_count} payments`}
                deltaType="moderateIncrease"
                color="emerald"
              />
              <MetricCard
                title="Active Classes"
                value={stats.classes.total}
                delta={`${stats.classes.enrollments} enrollments`}
                deltaType="moderateIncrease"
                color="violet"
              />
              <MetricCard
                title="Total Notes"
                value={stats.notes.total}
                delta={`+${stats.notes.this_month} this month`}
                deltaType={stats.notes.this_month > 0 ? 'increase' : 'unchanged'}
                color="amber"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500 mb-4">Revenue Trend (Last 30 Days)</p>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          tickFormatter={(value) => `$${value}`}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                          width={56}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#10b981" 
                          fill="#d1fae5" 
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500 mb-4">User Demographics</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userDemographics}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {userDemographics.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {userDemographics.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="text-sm text-gray-600">{item.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-gray-500 mb-4">Notes Activity (Last 30 Days)</p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={notesTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis 
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        width={40}
                      />
                      <Tooltip 
                        formatter={(value: number) => [value, 'Notes Created']}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#6366f1" 
                        fill="#e0e7ff" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-gray-900">Pending Inquiries</p>
                    <DeltaBadge 
                      value={`${stats.inquiries.pending} pending`} 
                      type={stats.inquiries.pending > 0 ? 'moderateIncrease' : 'unchanged'}
                    />
                  </div>
                  {stats.inquiries.recent.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {stats.inquiries.recent.map((inquiry) => (
                        <div key={inquiry.id} className="py-3 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{inquiry.name}</p>
                            <p className="text-xs text-gray-500 truncate">{inquiry.email}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push('/admin/studio-inquiries')}
                          >
                            View
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No pending inquiries</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-gray-900">Pending Waivers</p>
                    <DeltaBadge 
                      value={`${stats.waivers.pending} pending`} 
                      type={stats.waivers.pending > 0 ? 'moderateIncrease' : 'unchanged'}
                    />
                  </div>
                  {stats.waivers.recent.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {stats.waivers.recent.map((waiver) => (
                        <div key={waiver.id} className="py-3 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{waiver.student_name}</p>
                            <p className="text-xs text-gray-500 truncate">{waiver.waiver_title}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(waiver.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No pending waivers</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-cyan-50 to-white">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500">Studio Inquiries</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.inquiries.total}</p>
                  <p className="text-sm text-gray-600 mt-1">{stats.inquiries.pending} pending</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-50 to-white">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500">Waivers</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.waivers.total}</p>
                  <p className="text-sm text-gray-600 mt-1">{stats.waivers.signed} signed, {stats.waivers.pending} pending</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="p-6">
                  <p className="text-sm font-medium text-gray-500">Private Lessons</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stats.lesson_packs.available}</p>
                  <p className="text-sm text-gray-600 mt-1">{stats.lesson_packs.total_purchased} purchased, {stats.lesson_packs.total_used} used</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Failed to load statistics</p>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
