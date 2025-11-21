'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'

interface PaymentData {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  transaction_date: string
  confirmed_by_instructor_at: string | null
  confirmed_by_studio_at: string | null
  notes: string | null
  receipt_url: string | null
  student: {
    id: string
    full_name: string
    email: string | null
    phone: string | null
  }
  class: {
    id: string
    title: string
    start_time: string
    class_type: string
  } | null
  studio: {
    id: string
    name: string
    city: string | null
    state: string | null
  } | null
}

interface PaymentStats {
  total_payments: number
  total_amount: number
  pending: number
  confirmed: number
  disputed: number
  cancelled: number
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'disputed' | 'cancelled'

export default function InstructorPaymentsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'studio' ? 'studio' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchPayments()
    }
  }, [loading, user, profile, filterStatus])

  const fetchPayments = async () => {
    setLoadingPayments(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }

      const response = await fetch(`/api/instructor/payments?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleViewPayment = (payment: PaymentData) => {
    setSelectedPayment(payment)
  }

  const handleCloseModal = () => {
    setSelectedPayment(null)
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'danger' | 'warning' | 'secondary'> = {
      confirmed: 'success',
      pending: 'warning',
      disputed: 'danger',
      cancelled: 'secondary'
    }
    return colors[status] || 'secondary'
  }

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      stripe: 'Stripe',
      cash: 'Cash',
      check: 'Check',
      other: 'Other'
    }
    return labels[method] || method
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
        <p className="text-gray-600">View payments for your classes</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Payments</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total_payments}</div>
              <div className="text-sm text-gray-500 mt-1">{formatCurrency(stats.total_amount)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Confirmed</div>
              <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm font-medium text-gray-600 mb-1">Disputed</div>
              <div className="text-2xl font-bold text-red-600">{stats.disputed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filterStatus === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilterStatus('all')}
        >
          All
        </Button>
        <Button
          variant={filterStatus === 'pending' ? 'primary' : 'outline'}
          onClick={() => setFilterStatus('pending')}
        >
          Pending
        </Button>
        <Button
          variant={filterStatus === 'confirmed' ? 'primary' : 'outline'}
          onClick={() => setFilterStatus('confirmed')}
        >
          Confirmed
        </Button>
        <Button
          variant={filterStatus === 'disputed' ? 'primary' : 'outline'}
          onClick={() => setFilterStatus('disputed')}
        >
          Disputed
        </Button>
        <Button
          variant={filterStatus === 'cancelled' ? 'primary' : 'outline'}
          onClick={() => setFilterStatus('cancelled')}
        >
          Cancelled
        </Button>
      </div>

      {/* Payments List */}
      {loadingPayments ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : payments.length > 0 ? (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card
              key={payment.id}
              hover
              className="cursor-pointer"
              onClick={() => handleViewPayment(payment)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {payment.student.full_name}
                      </h3>
                      <Badge variant={getStatusColor(payment.payment_status)}>
                        {payment.payment_status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      {payment.class && (
                        <div>
                          <span className="font-medium">Class:</span> {payment.class.title}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Method:</span> {getPaymentMethodLabel(payment.payment_method)}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {formatDate(payment.transaction_date)}
                      </div>
                      {payment.studio && (
                        <div>
                          <span className="font-medium">Studio:</span> {payment.studio.name}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </div>
                    {payment.confirmed_by_instructor_at && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ Confirmed
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Payments Found
            </h3>
            <p className="text-gray-600">
              {filterStatus === 'all'
                ? 'No payment requests have been created yet.'
                : `No ${filterStatus} payments found.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Detail Modal */}
      <Modal
        isOpen={selectedPayment !== null}
        onClose={handleCloseModal}
        title="Payment Details"
        size="lg"
      >
        {selectedPayment && (
          <div className="divide-y divide-gray-200">
            {/* Payment Info */}
            <div className="pb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedPayment.payment_status)} size="sm">
                      {selectedPayment.payment_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="text-gray-900">{getPaymentMethodLabel(selectedPayment.payment_method)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Transaction Date</label>
                  <p className="text-gray-900">{formatDate(selectedPayment.transaction_date)}</p>
                </div>
                {selectedPayment.confirmed_by_instructor_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Instructor Confirmed</label>
                    <p className="text-gray-900">{formatDate(selectedPayment.confirmed_by_instructor_at)}</p>
                  </div>
                )}
                {selectedPayment.confirmed_by_studio_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Studio Confirmed</label>
                    <p className="text-gray-900">{formatDate(selectedPayment.confirmed_by_studio_at)}</p>
                  </div>
                )}
              </div>
              {selectedPayment.notes && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-gray-900 mt-1">{selectedPayment.notes}</p>
                </div>
              )}
            </div>

            {/* Student Info */}
            <div className="py-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Student</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{selectedPayment.student.full_name}</p>
                </div>
                {selectedPayment.student.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedPayment.student.email}</p>
                  </div>
                )}
                {selectedPayment.student.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{selectedPayment.student.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Class Info */}
            {selectedPayment.class && (
              <div className="py-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Class</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Title</label>
                    <p className="text-gray-900">{selectedPayment.class.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Type</label>
                    <p className="text-gray-900 capitalize">{selectedPayment.class.class_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date</label>
                    <p className="text-gray-900">{formatDate(selectedPayment.class.start_time)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Studio Info */}
            {selectedPayment.studio && (
              <div className="pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Studio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-gray-900">{selectedPayment.studio.name}</p>
                  </div>
                  {(selectedPayment.studio.city || selectedPayment.studio.state) && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Location</label>
                      <p className="text-gray-900">
                        {selectedPayment.studio.city}
                        {selectedPayment.studio.city && selectedPayment.studio.state && ', '}
                        {selectedPayment.studio.state}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PortalLayout>
  )
}
