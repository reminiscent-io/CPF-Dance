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
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import {
  Card as TremorCard,
  Grid,
  Metric,
  Text,
  BadgeDelta,
  Flex,
  DonutChart,
  AreaChart,
  List,
  ListItem,
  Bold
} from '@tremor/react'

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

  // User demographics data for donut chart
  const userDemographics = stats ? [
    { name: 'Dancers', value: stats.users.by_role.dancer || 0 },
    { name: 'Instructors', value: stats.users.by_role.instructor || 0 },
    { name: 'Guardians', value: stats.users.by_role.guardian || 0 },
    { name: 'Admins', value: stats.users.by_role.admin || 0 }
  ].filter(item => item.value > 0) : []

  // Format notes trend data for area chart
  const notesTrendData = stats?.notes.trend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Notes Created': item.count
  })) || []

  // Format revenue trend data for area chart
  const revenueTrendData = stats?.revenue.trend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    'Revenue': item.amount
  })) || []

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        {/* Header with Quick Links */}
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
            {/* Key Metrics Row */}
            <Grid numItemsSm={2} numItemsLg={4} className="gap-6">
              <TremorCard decoration="top" decorationColor="blue">
                <Flex alignItems="start">
                  <div>
                    <Text>Total Users</Text>
                    <Metric>{stats.users.total}</Metric>
                  </div>
                  <BadgeDelta deltaType={stats.users.new_this_month > 0 ? 'increase' : 'unchanged'}>
                    +{stats.users.new_this_month} this month
                  </BadgeDelta>
                </Flex>
              </TremorCard>

              <TremorCard decoration="top" decorationColor="emerald">
                <Flex alignItems="start">
                  <div>
                    <Text>Total Revenue</Text>
                    <Metric>{formatCurrency(stats.revenue.total)}</Metric>
                  </div>
                  <BadgeDelta deltaType="moderateIncrease">
                    {stats.revenue.payment_count} payments
                  </BadgeDelta>
                </Flex>
              </TremorCard>

              <TremorCard decoration="top" decorationColor="violet">
                <Flex alignItems="start">
                  <div>
                    <Text>Active Classes</Text>
                    <Metric>{stats.classes.total}</Metric>
                  </div>
                  <BadgeDelta deltaType="moderateIncrease">
                    {stats.classes.enrollments} enrollments
                  </BadgeDelta>
                </Flex>
              </TremorCard>

              <TremorCard decoration="top" decorationColor="amber">
                <Flex alignItems="start">
                  <div>
                    <Text>Total Notes</Text>
                    <Metric>{stats.notes.total}</Metric>
                  </div>
                  <BadgeDelta deltaType={stats.notes.this_month > 0 ? 'increase' : 'unchanged'}>
                    +{stats.notes.this_month} this month
                  </BadgeDelta>
                </Flex>
              </TremorCard>
            </Grid>

            {/* Bento Grid - Charts and Demographics */}
            <Grid numItemsSm={1} numItemsLg={3} className="gap-6">
              {/* Revenue Trend - Takes 2 columns */}
              <TremorCard className="col-span-1 lg:col-span-2">
                <Text>Revenue Trend (Last 30 Days)</Text>
                <AreaChart
                  className="mt-4 h-72"
                  data={revenueTrendData}
                  index="date"
                  categories={['Revenue']}
                  colors={['emerald']}
                  valueFormatter={(value) => formatCurrency(value)}
                  yAxisWidth={56}
                  showAnimation={true}
                />
              </TremorCard>

              {/* User Demographics - Takes 1 column */}
              <TremorCard>
                <Text>User Demographics</Text>
                <DonutChart
                  className="mt-4"
                  data={userDemographics}
                  category="value"
                  index="name"
                  colors={['rose', 'violet', 'amber', 'blue']}
                  showAnimation={true}
                />
                <div className="mt-4">
                  {userDemographics.map((item, idx) => (
                    <Flex key={idx} className="mt-2">
                      <Text>{item.name}</Text>
                      <Text><Bold>{item.value}</Bold></Text>
                    </Flex>
                  ))}
                </div>
              </TremorCard>
            </Grid>

            {/* Notes Activity Chart */}
            <TremorCard>
              <Text>Notes Activity (Last 30 Days)</Text>
              <AreaChart
                className="mt-4 h-60"
                data={notesTrendData}
                index="date"
                categories={['Notes Created']}
                colors={['indigo']}
                yAxisWidth={40}
                showAnimation={true}
              />
            </TremorCard>

            {/* Actionable Items - Tables */}
            <Grid numItemsSm={1} numItemsLg={2} className="gap-6">
              {/* Pending Inquiries */}
              <TremorCard>
                <Flex>
                  <Text className="font-semibold">Pending Inquiries</Text>
                  <BadgeDelta deltaType={stats.inquiries.pending > 0 ? 'moderateIncrease' : 'unchanged'}>
                    {stats.inquiries.pending} pending
                  </BadgeDelta>
                </Flex>
                {stats.inquiries.recent.length > 0 ? (
                  <List className="mt-4">
                    {stats.inquiries.recent.map((inquiry) => (
                      <ListItem key={inquiry.id}>
                        <Flex justifyContent="start" className="space-x-2 truncate">
                          <Bold className="truncate">{inquiry.name}</Bold>
                          <Text className="truncate text-xs">{inquiry.email}</Text>
                        </Flex>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/admin/studio-inquiries')}
                        >
                          View
                        </Button>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Text className="mt-4 text-gray-500">No pending inquiries</Text>
                )}
              </TremorCard>

              {/* Pending Waivers */}
              <TremorCard>
                <Flex>
                  <Text className="font-semibold">Pending Waivers</Text>
                  <BadgeDelta deltaType={stats.waivers.pending > 0 ? 'moderateIncrease' : 'unchanged'}>
                    {stats.waivers.pending} pending
                  </BadgeDelta>
                </Flex>
                {stats.waivers.recent.length > 0 ? (
                  <List className="mt-4">
                    {stats.waivers.recent.map((waiver) => (
                      <ListItem key={waiver.id}>
                        <Flex justifyContent="start" className="space-x-2 truncate">
                          <Bold className="truncate">{waiver.student_name}</Bold>
                          <Text className="truncate text-xs">{waiver.waiver_title}</Text>
                        </Flex>
                        <Text className="text-xs text-gray-500">
                          {new Date(waiver.created_at).toLocaleDateString()}
                        </Text>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Text className="mt-4 text-gray-500">No pending waivers</Text>
                )}
              </TremorCard>
            </Grid>

            {/* Additional Stats Cards */}
            <Grid numItemsSm={2} numItemsLg={3} className="gap-6">
              <Card className="bg-gradient-to-br from-cyan-50 to-white">
                <CardContent className="p-6">
                  <Text>Studio Inquiries</Text>
                  <Metric className="mt-2">{stats.inquiries.total}</Metric>
                  <Text className="mt-1 text-sm text-gray-600">{stats.inquiries.pending} pending</Text>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-violet-50 to-white">
                <CardContent className="p-6">
                  <Text>Waivers</Text>
                  <Metric className="mt-2">{stats.waivers.total}</Metric>
                  <Text className="mt-1 text-sm text-gray-600">{stats.waivers.signed} signed, {stats.waivers.pending} pending</Text>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-white">
                <CardContent className="p-6">
                  <Text>Private Lessons</Text>
                  <Metric className="mt-2">{stats.lesson_packs.available}</Metric>
                  <Text className="mt-1 text-sm text-gray-600">{stats.lesson_packs.total_purchased} purchased, {stats.lesson_packs.total_used} used</Text>
                </CardContent>
              </Card>
            </Grid>
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
