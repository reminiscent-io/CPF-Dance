'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Badge,
  Button,
  EmptyCell,
  EmptyState,
  Modal,
  PageHeader,
  SegmentedControl,
  Select,
  Spinner,
  StatusDot,
  Table,
  Toolbar
} from '@/components/ui'
import type { Column, StatusTone } from '@/components/ui'
import {
  BanknotesIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

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

function InstructorPaymentsContent() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [showUnpaidClasses, setShowUnpaidClasses] = useState(false)
  const [remindingClassId, setRemindingClassId] = useState<string | null>(null)
  const [remindMessage, setRemindMessage] = useState('')
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false)
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [recordPaymentData, setRecordPaymentData] = useState({
    student_id: '',
    class_id: '',
    studio_id: '',
    amount: '',
    payment_method: 'cash',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    if (!loading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [loading, profile, router])

  // Auto-open request modal if coming from invoices page
  useEffect(() => {
    if (searchParams?.get('request') === 'true') {
      handleOpenRequestModal()
      // Clear the query param
      router.replace('/instructor/payments', { scroll: false })
    }
  }, [searchParams])

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

  const getStatusTone = (status: string): StatusTone => {
    const tones: Record<string, StatusTone> = {
      confirmed: 'positive',
      pending: 'neutral',
      disputed: 'attention',
      cancelled: 'attention'
    }
    return tones[status] || 'neutral'
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

  const handleRemindClick = async (classId: string, className: string) => {
    setRemindingClassId(classId)
    try {
      const response = await fetch('/api/instructor/send-payment-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId })
      })

      if (response.ok) {
        setRemindMessage(`Reminder sent for "${className}"`)
        setTimeout(() => setRemindMessage(''), 3000)
      }
    } catch (error) {
      console.error('Error sending reminder:', error)
    } finally {
      setRemindingClassId(null)
    }
  }

  const unpaidClasses = classEarnings
    .filter(cls => cls.collected_amount < cls.calculated_value)
    .map(cls => ({
      id: cls.id,
      title: cls.title,
      start_time: cls.start_time,
      studio: cls.studio,
      outstanding: cls.calculated_value - cls.collected_amount
    }))

  const handleOpenRecordPaymentModal = () => {
    setShowRecordPaymentModal(true)
    fetchStudentsAndStudios()
  }

  const handleCloseRecordPaymentModal = () => {
    setShowRecordPaymentModal(false)
    setRecordPaymentData({
      student_id: '',
      class_id: '',
      studio_id: '',
      amount: '',
      payment_method: 'cash',
      transaction_date: new Date().toISOString().split('T')[0],
      notes: ''
    })
  }

  const handleRecordPayment = async () => {
    if (!recordPaymentData.student_id || !recordPaymentData.amount) {
      alert('Please select a student and enter an amount')
      return
    }

    setRecordingPayment(true)
    try {
      const response = await fetch('/api/instructor/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordPaymentData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to record payment')
      }

      alert('Payment recorded successfully!')
      handleCloseRecordPaymentModal()
      await fetchPayments()
      await fetchClassEarnings()
    } catch (error) {
      console.error('Error recording payment:', error)
      alert(error instanceof Error ? error.message : 'Failed to record payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return null
  }

  const earningsColumns: Column<ClassEarning>[] = [
    {
      key: 'class',
      header: 'Class',
      render: (cls) => (
        <div>
          <div className="font-medium">{cls.title}</div>
          {cls.studio && <div className="text-xs text-charcoal-500">{cls.studio.name}</div>}
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (cls) => <span className="capitalize">{cls.class_type.replace('_', ' ')}</span>
    },
    {
      key: 'date',
      header: 'Date',
      render: (cls) =>
        new Date(cls.start_time).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        })
    },
    {
      key: 'students',
      header: 'Students',
      numeric: true,
      render: (cls) => cls.enrollment_count
    },
    {
      key: 'value',
      header: 'Value',
      numeric: true,
      render: (cls) => formatCurrency(cls.calculated_value)
    },
    {
      key: 'collected',
      header: 'Collected',
      numeric: true,
      render: (cls) => (
        <span className={cls.collected_amount >= cls.calculated_value ? '' : 'text-rose-700'}>
          {formatCurrency(cls.collected_amount)}
        </span>
      )
    }
  ]

  const paymentColumns: Column<PaymentData>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (payment) => <span className="font-medium">{payment.student.full_name}</span>
    },
    {
      key: 'class',
      header: 'Class',
      render: (payment) =>
        payment.class || payment.studio ? (
          <div>
            <div>{payment.class ? payment.class.title : <EmptyCell />}</div>
            {payment.studio && (
              <div className="text-xs text-charcoal-500">{payment.studio.name}</div>
            )}
          </div>
        ) : (
          <EmptyCell />
        )
    },
    {
      key: 'method',
      header: 'Method',
      render: (payment) => getPaymentMethodLabel(payment.payment_method)
    },
    {
      key: 'date',
      header: 'Date',
      render: (payment) => formatDate(payment.transaction_date)
    },
    {
      key: 'amount',
      header: 'Amount',
      numeric: true,
      render: (payment) => formatCurrency(payment.amount)
    },
    {
      key: 'status',
      header: 'Status',
      render: (payment) => (
        <StatusDot
          tone={getStatusTone(payment.payment_status)}
          label={payment.payment_status}
          className="capitalize"
        />
      )
    }
  ]

  const paymentsEmptyState = (
    <EmptyState
      icon={<BanknotesIcon />}
      message={
        filterStatus === 'all'
          ? 'No payments recorded yet.'
          : `No ${filterStatus} payments in this view.`
      }
      action={
        filterStatus === 'all' ? (
          <Button onClick={handleOpenRecordPaymentModal}>
            <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
            Record payment
          </Button>
        ) : undefined
      }
    />
  )

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Earnings"
        subtitle="Track your class earnings and payment history."
        action={
          <Button onClick={handleOpenRecordPaymentModal}>
            <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
            Record payment
          </Button>
        }
      />

      {/* Class Earnings */}
      <section className="mt-header-gap">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold text-charcoal-950">Class earnings</h2>
          <div className="w-full sm:w-44">
            <Select
              aria-label="Earnings date range"
              value={earningsDateRange}
              onChange={(e) => setEarningsDateRange(e.target.value as EarningsDateRange)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'this_year', label: 'This Year' }
              ]}
            />
          </div>
        </div>

        {loadingEarnings ? (
          <div className="mt-5 flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : earningsSummary && (
          <>
            {remindMessage && (
              <div className="mt-5 rounded-lg border border-gold-200 bg-gold-100 px-4 py-3 text-sm text-gold-800">
                {remindMessage}
              </div>
            )}

            {/* Inline summary row */}
            <div className="mt-5 flex flex-wrap gap-y-4">
              <div className="pr-5">
                <div className="font-serif text-2xl font-semibold tabular-nums text-charcoal-950">
                  {formatCurrency(earningsSummary.total_value)}
                </div>
                <div className="text-sm text-charcoal-500">Total value</div>
              </div>
              <div className="border-l border-champagne-200 px-5">
                <div className="font-serif text-2xl font-semibold tabular-nums text-charcoal-950">
                  {formatCurrency(earningsSummary.total_collected)}
                </div>
                <div className="text-sm text-charcoal-500">Collected</div>
              </div>
              <div className="border-l border-champagne-200 px-5">
                <div className="font-serif text-2xl font-semibold tabular-nums text-charcoal-950">
                  {formatCurrency(earningsSummary.total_outstanding)}
                </div>
                <div className="text-sm text-charcoal-500">Outstanding</div>
              </div>
              <div className="border-l border-champagne-200 pl-5">
                <div className="font-serif text-2xl font-semibold tabular-nums text-charcoal-950">
                  {earningsSummary.total_classes}
                </div>
                <div className="text-sm text-charcoal-500">
                  {earningsSummary.total_classes === 1 ? 'Class' : 'Classes'}
                </div>
              </div>
            </div>

            {/* Outstanding classes with reminders */}
            {unpaidClasses.length > 0 && (
              <div className="mt-5">
                <button
                  onClick={() => setShowUnpaidClasses(!showUnpaidClasses)}
                  className="flex items-center gap-2 text-sm font-medium text-charcoal-500 transition-colors hover:text-charcoal-900"
                >
                  {showUnpaidClasses ? (
                    <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                  {unpaidClasses.length} {unpaidClasses.length === 1 ? 'class' : 'classes'} awaiting payment
                </button>

                {showUnpaidClasses && (
                  <div className="mt-3 max-h-[18rem] divide-y divide-champagne-200 overflow-y-auto rounded-lg border border-champagne-200 bg-champagne-50">
                    {unpaidClasses.map((cls) => (
                      <div key={cls.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-charcoal-900">{cls.title}</div>
                          <div className="text-xs text-charcoal-500">
                            {cls.studio?.name && <span>{cls.studio.name}, </span>}
                            {new Date(cls.start_time).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-sm font-medium tabular-nums text-rose-700">
                            {formatCurrency(cls.outstanding)}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemindClick(cls.id, cls.title)}
                            disabled={remindingClassId !== null}
                          >
                            {remindingClassId === cls.id ? 'Sending...' : 'Remind'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Class Type Breakdown */}
            {Object.keys(earningsSummary.by_class_type).length > 0 && (
              <div className="mt-5">
                <button
                  onClick={() => setShowEarningsBreakdown(!showEarningsBreakdown)}
                  className="flex items-center gap-2 text-sm font-medium text-charcoal-500 transition-colors hover:text-charcoal-900"
                >
                  {showEarningsBreakdown ? (
                    <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" aria-hidden="true" />
                  )}
                  Breakdown by class type
                </button>

                {showEarningsBreakdown && (
                  <div className="mt-3 divide-y divide-champagne-200">
                    {Object.entries(earningsSummary.by_class_type).map(([type, data]) => (
                      <div key={type} className="flex flex-wrap items-baseline justify-between gap-3 py-3">
                        <div className="text-sm font-medium capitalize text-charcoal-700">
                          {type.replace('_', ' ')}
                          <span className="ml-2 font-normal text-charcoal-500">
                            {data.count} {data.count === 1 ? 'class' : 'classes'}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-5">
                          <span className="text-sm tabular-nums text-charcoal-500">
                            {formatCurrency(data.collected)} collected
                          </span>
                          <span className="font-serif text-lg font-semibold tabular-nums text-charcoal-950">
                            {formatCurrency(data.value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recent Classes by Value */}
            {classEarnings.length > 0 && (
              <div className="mt-6">
                <h3 className="font-serif text-lg font-semibold text-charcoal-950">Recent classes by value</h3>
                <div className="mt-3">
                  <Table data={classEarnings.slice(0, 10)} columns={earningsColumns} />
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <hr className="mt-6 border-champagne-200" />

      {/* Payment History */}
      <section className="mt-6">
        <h2 className="font-serif text-xl font-semibold text-charcoal-950">Payment history</h2>

        <Toolbar
          filters={
            <SegmentedControl<FilterStatus>
              aria-label="Filter payments by status"
              options={[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'disputed', label: 'Disputed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
              value={filterStatus}
              onChange={setFilterStatus}
            />
          }
        />

        {/* Desktop Table View */}
        <div className="mt-toolbar-gap hidden md:block">
          <Table
            data={payments}
            columns={paymentColumns}
            onRowClick={handleViewPayment}
            loading={loadingPayments}
            empty={paymentsEmptyState}
          />
        </div>

        {/* Mobile Card View */}
        <div className="mt-toolbar-gap md:hidden">
          {loadingPayments ? (
            <div className="rounded-lg border border-champagne-200 bg-champagne-50 p-8 text-center">
              <Spinner size="md" className="mx-auto" />
              <p className="mt-2 text-charcoal-500">Loading...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-lg border border-champagne-200 bg-champagne-50">
              {paymentsEmptyState}
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  onClick={() => handleViewPayment(payment)}
                  className="cursor-pointer rounded-lg border border-champagne-200 bg-champagne-50 p-4 transition-colors hover:bg-champagne-100 active:bg-champagne-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-serif text-lg font-semibold text-charcoal-950">
                        {payment.student.full_name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-charcoal-700">
                        {payment.class && (
                          <span className="inline-flex items-center">
                            <span className="text-charcoal-400 mr-1">Class:</span>
                            {payment.class.title}
                          </span>
                        )}
                        <span className="inline-flex items-center">
                          <span className="text-charcoal-400 mr-1">Method:</span>
                          {getPaymentMethodLabel(payment.payment_method)}
                        </span>
                        <span className="inline-flex items-center">
                          <span className="text-charcoal-400 mr-1">Date:</span>
                          {formatDate(payment.transaction_date)}
                        </span>
                        {payment.studio && (
                          <span className="inline-flex items-center">
                            <span className="text-charcoal-400 mr-1">Studio:</span>
                            {payment.studio.name}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <StatusDot
                          tone={getStatusTone(payment.payment_status)}
                          label={payment.payment_status}
                          className="capitalize"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-xl font-semibold tabular-nums text-charcoal-950">
                        {formatCurrency(payment.amount)}
                      </div>
                      {payment.confirmed_by_instructor_at && (
                        <div className="mt-1 text-xs text-gold-700">Confirmed</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Request Payment Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={handleCloseRequestModal}
        title="Request Payment"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Recipient Type *
            </label>
            <SegmentedControl<'student' | 'studio'>
              aria-label="Recipient type"
              options={[
                { value: 'student', label: 'Student' },
                { value: 'studio', label: 'Studio' }
              ]}
              value={requestFormData2.recipient_type}
              onChange={(value) => {
                setRequestFormData2({ ...requestFormData2, recipient_type: value, recipient_id: '', recipient_name: '' })
                fetchStudentsAndStudios()
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
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
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            <p className="text-xs text-charcoal-500 mt-1">
              {requestFormData2.recipient_id ? 'Selected from existing records' : 'Or enter new details below'}
            </p>
          </div>

          {!requestFormData2.recipient_id && (
            <>
              <div>
                <label className="block text-sm font-medium text-charcoal-500 mb-2">
                  New {requestFormData2.recipient_type === 'student' ? 'Student' : 'Studio'} Name
                </label>
                <input
                  type="text"
                  value={requestFormData2.recipient_name}
                  onChange={(e) => setRequestFormData2({ ...requestFormData2, recipient_name: e.target.value })}
                  placeholder={requestFormData2.recipient_type === 'student' ? 'e.g., Sarah Johnson' : 'e.g., Downtown Dance Studio'}
                  className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-500 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={requestFormData2.recipient_email}
                  onChange={(e) => setRequestFormData2({ ...requestFormData2, recipient_email: e.target.value })}
                  placeholder="e.g., sarah@example.com"
                  className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Amount * (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={requestFormData2.amount}
              onChange={(e) => setRequestFormData2({ ...requestFormData2, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Payment Method *
            </label>
            <select
              value={requestFormData2.payment_method}
              onChange={(e) => setRequestFormData2({ ...requestFormData2, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="stripe">Stripe</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Notes
            </label>
            <textarea
              value={requestFormData2.notes}
              onChange={(e) => setRequestFormData2({ ...requestFormData2, notes: e.target.value })}
              placeholder="Additional notes or description..."
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
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

      {/* Record Payment Modal */}
      <Modal
        isOpen={showRecordPaymentModal}
        onClose={handleCloseRecordPaymentModal}
        title="Record Payment"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-charcoal-500">
            Record a cash or check payment that you've already received from a student.
          </p>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Student *
            </label>
            <select
              value={recordPaymentData.student_id}
              onChange={(e) => setRecordPaymentData({ ...recordPaymentData, student_id: e.target.value })}
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Select Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.profile.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Amount * (USD)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={recordPaymentData.amount}
              onChange={(e) => setRecordPaymentData({ ...recordPaymentData, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Payment Method *
            </label>
            <select
              value={recordPaymentData.payment_method}
              onChange={(e) => setRecordPaymentData({ ...recordPaymentData, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Payment Date *
            </label>
            <input
              type="date"
              value={recordPaymentData.transaction_date}
              onChange={(e) => setRecordPaymentData({ ...recordPaymentData, transaction_date: e.target.value })}
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Class (Optional)
            </label>
            <select
              value={recordPaymentData.class_id}
              onChange={(e) => setRecordPaymentData({ ...recordPaymentData, class_id: e.target.value })}
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- None --</option>
              {classEarnings.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.title} - {new Date(cls.start_time).toLocaleDateString()}
                </option>
              ))}
            </select>
            <p className="text-xs text-charcoal-500 mt-1">
              Link this payment to a specific class
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Studio (Optional)
            </label>
            <select
              value={recordPaymentData.studio_id}
              onChange={(e) => setRecordPaymentData({ ...recordPaymentData, studio_id: e.target.value })}
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- None --</option>
              {studios.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-500 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={recordPaymentData.notes}
              onChange={(e) => setRecordPaymentData({ ...recordPaymentData, notes: e.target.value })}
              placeholder="Additional notes about this payment..."
              className="w-full px-3 py-2 border border-champagne-200 rounded-lg bg-champagne-50 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleCloseRecordPaymentModal}
              disabled={recordingPayment}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleRecordPayment}
              disabled={recordingPayment}
              className="flex-1"
            >
              {recordingPayment ? 'Recording...' : 'Record Payment'}
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
          <div className="divide-y divide-champagne-200">
            {/* Payment Info */}
            <div className="pb-6">
              <h3 className="font-serif text-lg font-semibold text-charcoal-950 mb-3">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-charcoal-500">Amount</label>
                  <p className="font-serif text-2xl font-semibold tabular-nums text-charcoal-950">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-charcoal-500">Status</label>
                  <div className="mt-1">
                    <Badge variant={getStatusColor(selectedPayment.payment_status)} size="sm">
                      {selectedPayment.payment_status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-charcoal-500">Payment Method</label>
                  <p className="text-charcoal-950">{getPaymentMethodLabel(selectedPayment.payment_method)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-charcoal-500">Transaction Date</label>
                  <p className="text-charcoal-950">{formatDate(selectedPayment.transaction_date)}</p>
                </div>
                {selectedPayment.confirmed_by_instructor_at && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Instructor Confirmed</label>
                    <p className="text-charcoal-950">{formatDate(selectedPayment.confirmed_by_instructor_at)}</p>
                  </div>
                )}
                {selectedPayment.confirmed_by_studio_at && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Studio Confirmed</label>
                    <p className="text-charcoal-950">{formatDate(selectedPayment.confirmed_by_studio_at)}</p>
                  </div>
                )}
              </div>
              {selectedPayment.notes && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-charcoal-500">Notes</label>
                  <p className="text-charcoal-950 mt-1">{selectedPayment.notes}</p>
                </div>
              )}
            </div>

            {/* Student Info */}
            <div className="py-6">
              <h3 className="font-serif text-lg font-semibold text-charcoal-950 mb-3">Student</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-charcoal-500">Name</label>
                  <p className="text-charcoal-950">{selectedPayment.student.full_name}</p>
                </div>
                {selectedPayment.student.email && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Email</label>
                    <p className="text-charcoal-950">{selectedPayment.student.email}</p>
                  </div>
                )}
                {selectedPayment.student.phone && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Phone</label>
                    <p className="text-charcoal-950">{selectedPayment.student.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Class Info */}
            {selectedPayment.class && (
              <div className="py-6">
                <h3 className="font-serif text-lg font-semibold text-charcoal-950 mb-3">Class</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Title</label>
                    <p className="text-charcoal-950">{selectedPayment.class.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Type</label>
                    <p className="text-charcoal-950 capitalize">{selectedPayment.class.class_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Date</label>
                    <p className="text-charcoal-950">{formatDate(selectedPayment.class.start_time)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Studio Info */}
            {selectedPayment.studio && (
              <div className="pt-6">
                <h3 className="font-serif text-lg font-semibold text-charcoal-950 mb-3">Studio</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-charcoal-500">Name</label>
                    <p className="text-charcoal-950">{selectedPayment.studio.name}</p>
                  </div>
                  {(selectedPayment.studio.city || selectedPayment.studio.state) && (
                    <div>
                      <label className="text-sm font-medium text-charcoal-500">Location</label>
                      <p className="text-charcoal-950">
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

export default function InstructorPaymentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <Spinner size="lg" />
      </div>
    }>
      <InstructorPaymentsContent />
    </Suspense>
  )
}
