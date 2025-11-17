'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Table } from '@/components/ui/Table'
import type { Column } from '@/components/ui/Table'

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  transaction_date: string
  notes: string | null
  receipt_url: string | null
  created_at: string
  class_id: string | null
  classes: {
    id: string
    title: string
    start_time: string
  } | null
}

type FilterType = 'all' | 'confirmed' | 'pending'

export default function DancerPaymentsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchPayments()
    }
  }, [loading, user, profile])

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/dancer/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoadingPayments(false)
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

  const filteredPayments = payments.filter((payment) => {
    if (filter === 'all') return true
    return payment.payment_status === filter
  })

  const totalDue = payments
    .filter((p) => p.payment_status === 'pending')
    .reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0)

  const getStatusColor = (status: string): any => {
    const colors: Record<string, any> = {
      confirmed: 'success',
      pending: 'warning',
      disputed: 'danger',
      cancelled: 'default'
    }
    return colors[status] || 'default'
  }

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, string> = {
      stripe: '💳',
      cash: '💵',
      check: '📝',
      other: '💰'
    }
    return icons[method] || '💰'
  }

  const columns: Column<Payment>[] = [
    {
      key: 'transaction_date',
      header: 'Date',
      render: (payment) =>
        new Date(payment.transaction_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (payment) => (
        <span className="font-semibold text-gray-900">
          ${parseFloat(payment.amount.toString()).toFixed(2)}
        </span>
      )
    },
    {
      key: 'class_id',
      header: 'Description',
      render: (payment) => (
        <div>
          {payment.classes ? (
            <div>
              <div className="font-medium text-gray-900">{payment.classes.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(payment.classes.start_time).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <span className="text-gray-600">General Payment</span>
          )}
        </div>
      )
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (payment) => (
        <div className="flex items-center gap-2">
          <span>{getPaymentMethodIcon(payment.payment_method)}</span>
          <span className="capitalize">{payment.payment_method}</span>
        </div>
      )
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (payment) => (
        <Badge variant={getStatusColor(payment.payment_status)}>
          {payment.payment_status.charAt(0).toUpperCase() +
            payment.payment_status.slice(1)}
        </Badge>
      )
    },
    {
      key: 'receipt_url',
      header: 'Receipt',
      render: (payment) =>
        payment.receipt_url ? (
          <a
            href={payment.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 hover:text-rose-700 underline"
          >
            Download
          </a>
        ) : (
          <span className="text-gray-400">N/A</span>
        )
    }
  ]

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment History 💳</h1>
        <p className="text-gray-600">Track your dance class payments and receipts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Due</p>
                <p className="text-3xl font-bold text-yellow-600">
                  ${totalDue.toFixed(2)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Confirmed</p>
                <p className="text-3xl font-bold text-green-600">
                  {payments.filter((p) => p.payment_status === 'confirmed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {payments.filter((p) => p.payment_status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All Payments
        </Button>
        <Button
          variant={filter === 'confirmed' ? 'primary' : 'outline'}
          onClick={() => setFilter('confirmed')}
        >
          Confirmed
        </Button>
        <Button
          variant={filter === 'pending' ? 'primary' : 'outline'}
          onClick={() => setFilter('pending')}
        >
          Pending
        </Button>
      </div>

      {loadingPayments ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredPayments.length > 0 ? (
        <Table
          data={filteredPayments}
          columns={columns}
          emptyMessage="No payments found"
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No Payments Yet' : `No ${filter} Payments`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "Your payment history will appear here once you've made payments for classes."
                : `You don't have any ${filter} payments at the moment.`}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View All Payments
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  )
}
