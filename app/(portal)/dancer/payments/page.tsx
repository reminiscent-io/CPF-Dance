'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

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

interface LessonPack {
  id: string
  name: string
  lesson_count: number
  price: number
}

interface LessonPackPurchase {
  id: string
  purchased_at: string
  remaining_lessons: number
  expires_at: string | null
  lesson_packs: LessonPack
}

interface LessonPackUsage {
  id: string
  lessons_used: number
  used_at: string
  lesson_pack_purchases: {
    id: string
    student_id: string
    lesson_packs: {
      id: string
      name: string
    }
  }
  private_lesson_requests: {
    id: string
    requested_focus: string | null
  } | null
}

// Unified transaction type for display
interface Transaction {
  id: string
  type: 'payment' | 'pack_purchase' | 'lesson_used'
  date: string
  title: string
  subtitle?: string
  amount?: number
  status?: string
  receipt_url?: string | null
  remaining?: number
}

export default function DancerPaymentsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [lessonPackPurchases, setLessonPackPurchases] = useState<LessonPackPurchase[]>([])
  const [lessonPackUsage, setLessonPackUsage] = useState<LessonPackUsage[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchData()
    }
  }, [loading, user, profile])

  const fetchData = async () => {
    try {
      const response = await fetch('/api/dancer/payments')
      if (response.ok) {
        const data = await response.json()
        setPayments(data.payments || [])
        setLessonPackPurchases(data.lessonPackPurchases || [])
        setLessonPackUsage(data.lessonPackUsage || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
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

  // Build unified transaction list
  const transactions: Transaction[] = [
    // Regular payments
    ...payments.map((p): Transaction => ({
      id: `payment-${p.id}`,
      type: 'payment',
      date: p.transaction_date,
      title: p.classes?.title || 'Class Payment',
      amount: parseFloat(p.amount.toString()),
      status: p.payment_status,
      receipt_url: p.receipt_url
    })),
    // Lesson pack purchases
    ...lessonPackPurchases.map((p): Transaction => ({
      id: `pack-${p.id}`,
      type: 'pack_purchase',
      date: p.purchased_at,
      title: p.lesson_packs?.name || 'Lesson Pack',
      subtitle: `${p.lesson_packs?.lesson_count || 0} lessons`,
      amount: p.lesson_packs?.price ? parseFloat(p.lesson_packs.price.toString()) : undefined,
      remaining: p.remaining_lessons
    })),
    // Lesson usage
    ...lessonPackUsage.map((u): Transaction => ({
      id: `usage-${u.id}`,
      type: 'lesson_used',
      date: u.used_at,
      title: 'Private Lesson',
      subtitle: u.private_lesson_requests?.requested_focus || u.lesson_pack_purchases?.lesson_packs?.name || 'Lesson Pack'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Separate pending payments
  const pendingPayments = payments.filter((p) => p.payment_status === 'pending')

  // Active lesson packs (with remaining lessons)
  const activePacks = lessonPackPurchases.filter((p) => p.remaining_lessons > 0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const TransactionRow = ({ transaction }: { transaction: Transaction }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          transaction.type === 'lesson_used'
            ? 'bg-emerald-50 text-emerald-600'
            : transaction.type === 'pack_purchase'
            ? 'bg-violet-50 text-violet-600'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {transaction.type === 'lesson_used' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : transaction.type === 'pack_purchase' ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">{transaction.title}</p>
          <p className="text-sm text-gray-500">
            {formatDate(transaction.date)}
            {transaction.subtitle && ` · ${transaction.subtitle}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        {transaction.type === 'lesson_used' ? (
          <span className="text-emerald-600 text-sm font-medium">Lesson used</span>
        ) : (
          <>
            {transaction.amount !== undefined && (
              <span className="text-gray-700 font-medium">
                ${transaction.amount.toFixed(2)}
              </span>
            )}
            {transaction.status && (
              <Badge
                variant={transaction.status === 'confirmed' ? 'success' : transaction.status === 'pending' ? 'warning' : 'default'}
                className="text-xs"
              >
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
              </Badge>
            )}
          </>
        )}
        {transaction.receipt_url && (
          <a
            href={transaction.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 hover:text-rose-700 text-sm"
          >
            Receipt
          </a>
        )}
      </div>
    </div>
  )

  const hasData = transactions.length > 0 || activePacks.length > 0

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
        <p className="text-gray-600">View your payment history and lesson packs</p>
      </div>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No payments yet</h3>
            <p className="text-gray-500">Your payment history will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Lesson Packs */}
          {activePacks.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Lesson Packs</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {activePacks.map((pack) => (
                    <div
                      key={pack.id}
                      className="bg-gradient-to-br from-violet-50 to-white border border-violet-100 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{pack.lesson_packs?.name}</h3>
                        <Badge variant="default" className="bg-violet-100 text-violet-700">
                          {pack.remaining_lessons} left
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {pack.lesson_packs?.lesson_count} lesson pack
                        {pack.expires_at && ` · Expires ${formatDate(pack.expires_at)}`}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Outstanding Payments */}
          {pendingPayments.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Outstanding</h2>
                  <span className="text-sm text-gray-500">
                    {pendingPayments.length} {pendingPayments.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div>
                  {pendingPayments.map((payment) => (
                    <TransactionRow
                      key={payment.id}
                      transaction={{
                        id: `payment-${payment.id}`,
                        type: 'payment',
                        date: payment.transaction_date,
                        title: payment.classes?.title || 'Class Payment',
                        amount: parseFloat(payment.amount.toString()),
                        status: payment.payment_status,
                        receipt_url: payment.receipt_url
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transaction History */}
          {transactions.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">History</h2>
                <div>
                  {transactions
                    .filter(t => !(t.type === 'payment' && t.status === 'pending'))
                    .map((transaction) => (
                      <TransactionRow key={transaction.id} transaction={transaction} />
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </PortalLayout>
  )
}
