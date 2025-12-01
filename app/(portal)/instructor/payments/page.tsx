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
import { EarningsProgressWidget } from '@/components/EarningsProgressWidget'

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

interface ClassEarning {
  id: string
  title: string
  class_type: string
  start_time: string
  end_time: string
  pricing_model: string
  enrollment_count: number
  calculated_value: number
  collected_amount: number
  studio?: { id: string; name: string } | null
}

interface EarningsSummary {
  total_classes: number
  total_value: number
  total_collected: number
  total_outstanding: number
  by_class_type: Record<string, { count: number; value: number; collected: number }>
}

type FilterStatus = 'all' | 'pending' | 'confirmed' | 'disputed' | 'cancelled'
type EarningsDateRange = 'all' | 'this_month' | 'last_month' | 'this_year'

export default function InstructorPaymentsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [payments, setPayments] = useState<PaymentData[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestFormData, setRequestFormData] = useState({
    recipient_type: 'student' as 'student' | 'studio',
    recipient_name: '',
    recipient_email: '',
    amount: '',
    payment_method: 'cash' as string,
    notes: ''
  })
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [students, setStudents] = useState<Array<{ id: string; profile: { full_name: string; email?: string } }>>([])
  const [studios, setStudios] = useState<Array<{ id: string; name: string }>>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [requestFormData2, setRequestFormData2] = useState({
    recipient_type: 'student' as 'student' | 'studio',
    recipient_id: '', // For existing
    recipient_name: '',
    recipient_email: '',
    amount: '',
    payment_method: 'cash' as string,
    notes: ''
  })

  const [classEarnings, setClassEarnings] = useState<ClassEarning[]>([])
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null)
  const [loadingEarnings, setLoadingEarnings] = useState(true)
  const [earningsDateRange, setEarningsDateRange] = useState<EarningsDateRange>('all')
  const [showEarningsBreakdown, setShowEarningsBreakdown] = useState(false)

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

  useEffect(() => {
    if (!loading && user && profile) {
      fetchClassEarnings()
    }
  }, [loading, user, profile, earningsDateRange])

  const fetchClassEarnings = async () => {
    setLoadingEarnings(true)
    try {
      const params = new URLSearchParams()
      
      if (earningsDateRange !== 'all') {
        const now = new Date()
        let startDate: Date
        let endDate: Date = now
        
        switch (earningsDateRange) {
          case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            break
          case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            endDate = new Date(now.getFullYear(), now.getMonth(), 0)
            break
          case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1)
            break
          default:
            startDate = new Date(0)
        }
        
        params.append('start_date', startDate.toISOString())
        params.append('end_date', endDate.toISOString())
      }

      const response = await fetch(`/api/instructor/class-earnings?${params}`)
      if (response.ok) {
        const data = await response.json()
        setClassEarnings(data.classes)
        setEarningsSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching class earnings:', error)
    } finally {
      setLoadingEarnings(false)
    }
  }

  const fetchStudentsAndStudios = async () => {
    if (loadingOptions) return
    setLoadingOptions(true)
    try {
      const [studentsRes, studiosRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/studios')
      ])
      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data.students || [])
      }
      if (studiosRes.ok) {
        const data = await studiosRes.json()
        setStudios(data.studios || [])
      }
    } catch (error) {
      console.error('Error fetching options:', error)
    } finally {
      setLoadingOptions(false)
    }
  }

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

  const handleOpenRequestModal = () => {
    setShowRequestModal(true)
    fetchStudentsAndStudios()
  }

  const handleCloseRequestModal = () => {
    setShowRequestModal(false)
    setRequestFormData2({
      recipient_type: 'student',
      recipient_id: '',
      recipient_name: '',
      recipient_email: '',
      amount: '',
      payment_method: 'cash',
      notes: ''
    })
  }

  const handleSubmitPaymentRequest = async () => {
    if (!requestFormData2.amount) {
      alert('Please fill in all required fields')
      return
    }

    const payload = {
      recipient_type: requestFormData2.recipient_type,
      recipient_id: requestFormData2.recipient_id || undefined,
      recipient_name: requestFormData2.recipient_name,
      recipient_email: requestFormData2.recipient_email,
      amount: requestFormData2.amount,
      payment_method: requestFormData2.payment_method,
      notes: requestFormData2.notes
    }

    setSubmittingRequest(true)
    try {
      const response = await fetch('/api/instructor/payment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create payment request')
      }

      const data = await response.json()
      alert(data.message)
      handleCloseRequestModal()
      await fetchPayments()
    } catch (error) {
      console.error('Error submitting payment request:', error)
      alert(error instanceof Error ? error.message : 'Failed to create payment request')
    } finally {
      setSubmittingRequest(false)
    }
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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
          <p className="text-gray-600">View payments for your classes</p>
        </div>
        <Button variant="primary" onClick={handleOpenRequestModal}>
          + Request Payment
        </Button>
      </div>

      {/* Hero Summary Section */}
      {stats && (
        <div className="mb-6">
          {/* Hero Card - Total Payments */}
          <Card className="bg-gradient-to-br from-pink-100 to-pink-50 border-pink-300 border-2 mb-3">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-pink-700 mb-1 tracking-wide">Total Payments Collected</div>
              <div className="text-3xl font-bold text-pink-900">{formatCurrency(stats.total_amount)}</div>
              <div className="text-xs text-pink-700">{stats.total_payments} payments recorded</div>
            </CardContent>
          </Card>
          
          {/* Status Grid - Compact */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Card className="bg-gradient-to-br from-amber-50 to-amber-50 border-amber-200">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-amber-700 uppercase mb-0.5">Pending</div>
                <div className="text-xl font-bold text-amber-700">{stats.pending}</div>
                <div className="text-xs text-amber-600">Action required</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="text-xs font-medium text-green-700 uppercase mb-0.5">Confirmed</div>
                <div className="text-xl font-bold text-green-700">{stats.confirmed}</div>
                <div className="text-xs text-green-600">Collected</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-50 to-red-50 border-red-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-1">
                  <span className="text-sm">⚠️</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-red-700 uppercase">Disputed</div>
                    <div className="text-xl font-bold text-red-700">{stats.disputed}</div>
                  </div>
                </div>
                <div className="text-xs text-red-600">Needs attention</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Class Earnings Dashboard */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Class Earnings</h2>
          <div className="flex gap-2">
            <select
              value={earningsDateRange}
              onChange={(e) => setEarningsDateRange(e.target.value as EarningsDateRange)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>
        </div>

        {loadingEarnings ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : earningsSummary && (
          <>
            <div className="mb-8">
              <EarningsProgressWidget
                total={earningsSummary.total_value}
                collected={earningsSummary.total_collected}
                outstanding={earningsSummary.total_outstanding}
                classes={earningsSummary.total_classes}
              />
            </div>

            {/* Class Type Breakdown */}
            {Object.keys(earningsSummary.by_class_type).length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowEarningsBreakdown(!showEarningsBreakdown)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-3"
                >
                  <span>{showEarningsBreakdown ? '▼' : '▶'}</span>
                  Breakdown by Class Type
                </button>
                
                {showEarningsBreakdown && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(earningsSummary.by_class_type).map(([type, data]) => (
                      <Card key={type} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-500 capitalize mb-2">
                            {type.replace('_', ' ')}
                          </div>
                          <div className="text-lg font-bold text-gray-900">{formatCurrency(data.value)}</div>
                          <div className="flex justify-between text-xs text-gray-500 mt-2">
                            <span>{data.count} classes</span>
                            <span className="text-green-600">{formatCurrency(data.collected)} collected</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top Classes by Value */}
            {classEarnings.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Recent Classes by Value</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Class</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600">Students</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Value</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600">Collected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classEarnings.slice(0, 10).map((cls) => (
                        <tr key={cls.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{cls.title}</div>
                            {cls.studio && (
                              <div className="text-xs text-gray-500">{cls.studio.name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" size="sm">
                              {cls.class_type.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(cls.start_time).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{cls.enrollment_count}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900">
                            {formatCurrency(cls.calculated_value)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cls.collected_amount >= cls.calculated_value ? 'text-green-600' : 'text-amber-600'}>
                              {formatCurrency(cls.collected_amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <hr className="my-8 border-gray-200" />

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h2>

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

      {/* Request Payment Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={handleCloseRequestModal}
        title="Request Payment"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Type *
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRequestFormData2({ ...requestFormData2, recipient_type: 'student', recipient_id: '', recipient_name: '' })
                  fetchStudentsAndStudios()
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  requestFormData2.recipient_type === 'student'
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Student
              </button>
              <button
                onClick={() => {
                  setRequestFormData2({ ...requestFormData2, recipient_type: 'studio', recipient_id: '', recipient_name: '' })
                  fetchStudentsAndStudios()
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  requestFormData2.recipient_type === 'studio'
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Studio
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {requestFormData2.recipient_type === 'student' ? 'Student' : 'Studio'} *
            </label>
            <select
              value={requestFormData2.recipient_id}
              onChange={(e) => {
                const selected = e.target.value
                if (requestFormData2.recipient_type === 'student') {
                  const student = students.find(s => s.id === selected)
                  if (student) {
                    setRequestFormData2({
                      ...requestFormData2,
                      recipient_id: selected,
                      recipient_name: student.profile.full_name,
                      recipient_email: student.profile.email || ''
                    })
                  }
                } else {
                  const studio = studios.find(s => s.id === selected)
                  if (studio) {
                    setRequestFormData2({
                      ...requestFormData2,
                      recipient_id: selected,
                      recipient_name: studio.name,
                      recipient_email: ''
                    })
                  }
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Select {requestFormData2.recipient_type} --</option>
              {requestFormData2.recipient_type === 'student'
                ? students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.profile.full_name}
                    </option>
                  ))
                : studios.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {requestFormData2.recipient_id ? 'Selected from existing records' : 'Or enter new details below'}
            </p>
          </div>

          {!requestFormData2.recipient_id && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New {requestFormData2.recipient_type === 'student' ? 'Student' : 'Studio'} Name
                </label>
                <input
                  type="text"
                  value={requestFormData2.recipient_name}
                  onChange={(e) => setRequestFormData2({ ...requestFormData2, recipient_name: e.target.value })}
                  placeholder={requestFormData2.recipient_type === 'student' ? 'e.g., Sarah Johnson' : 'e.g., Downtown Dance Studio'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={requestFormData2.recipient_email}
                  onChange={(e) => setRequestFormData2({ ...requestFormData2, recipient_email: e.target.value })}
                  placeholder="e.g., sarah@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount * (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={requestFormData2.amount}
              onChange={(e) => setRequestFormData2({ ...requestFormData2, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <select
              value={requestFormData2.payment_method}
              onChange={(e) => setRequestFormData2({ ...requestFormData2, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="stripe">Stripe</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={requestFormData2.notes}
              onChange={(e) => setRequestFormData2({ ...requestFormData2, notes: e.target.value })}
              placeholder="Additional notes or description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseRequestModal}
              disabled={submittingRequest}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitPaymentRequest}
              disabled={submittingRequest}
              className="flex-1"
            >
              {submittingRequest ? 'Submitting...' : 'Create Request'}
            </Button>
          </div>
        </div>
      </Modal>

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
