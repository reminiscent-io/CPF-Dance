'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Spinner } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusDot } from '@/components/ui/StatusDot'

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

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

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
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-charcoal-500 tracking-wide">Loading</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) return null

  const transactions: Transaction[] = [
    ...payments.map((p): Transaction => ({
      id: `payment-${p.id}`,
      type: 'payment',
      date: p.transaction_date,
      title: p.classes?.title || 'Class payment',
      amount: parseFloat(p.amount.toString()),
      status: p.payment_status,
      receipt_url: p.receipt_url,
    })),
    ...lessonPackPurchases.map((p): Transaction => ({
      id: `pack-${p.id}`,
      type: 'pack_purchase',
      date: p.purchased_at,
      title: p.lesson_packs?.name || `${p.lesson_packs?.lesson_count ?? '?'}-pack`,
      subtitle: `${p.lesson_packs?.lesson_count ?? '?'} ${p.lesson_packs?.lesson_count === 1 ? 'lesson' : 'lessons'}`,
      amount: p.lesson_packs?.price ? parseFloat(p.lesson_packs.price.toString()) : undefined,
      remaining: p.remaining_lessons,
    })),
    ...lessonPackUsage.map((u): Transaction => ({
      id: `usage-${u.id}`,
      type: 'lesson_used',
      date: u.used_at,
      title: u.private_lesson_requests?.requested_focus || 'Private lesson',
      subtitle: u.lesson_pack_purchases?.lesson_packs?.name,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const pendingPayments = payments.filter((p) => p.payment_status === 'pending')
  const activePacks = lessonPackPurchases.filter((p) => p.remaining_lessons > 0)
  const historyTransactions = transactions.filter(
    (t) => !(t.type === 'payment' && t.status === 'pending')
  )
  const hasData = transactions.length > 0 || activePacks.length > 0

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Payments"
        subtitle="Your lesson packs, payments, and receipts."
      />

      <div className="mt-header-gap">
      {loadingData ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !hasData ? (
        <div className="border-t border-champagne-200 pt-16 lg:pt-20 text-center">
          <p className="font-serif text-2xl md:text-3xl text-charcoal-950 tracking-tight">
            Nothing here yet.
          </p>
          <p className="mt-3 text-sm text-charcoal-500 leading-relaxed max-w-sm mx-auto">
            Once you book a lesson or buy a pack, the trail starts here.
          </p>
        </div>
      ) : (
        <div className="space-y-12 lg:space-y-16">
          {activePacks.length > 0 && <ActivePacksSection packs={activePacks} />}

          {pendingPayments.length > 0 && (
            <PaymentsSection
              id="outstanding-heading"
              title="Outstanding"
              eyebrow={`${pendingPayments.length} ${pendingPayments.length === 1 ? 'item' : 'items'}`}
            >
              {pendingPayments.map((payment) => (
                <TransactionRow
                  key={payment.id}
                  transaction={{
                    id: `payment-${payment.id}`,
                    type: 'payment',
                    date: payment.transaction_date,
                    title: payment.classes?.title || 'Class payment',
                    amount: parseFloat(payment.amount.toString()),
                    status: payment.payment_status,
                    receipt_url: payment.receipt_url,
                  }}
                />
              ))}
            </PaymentsSection>
          )}

          {historyTransactions.length > 0 && (
            <PaymentsSection id="history-heading" title="History">
              {historyTransactions.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </PaymentsSection>
          )}
        </div>
      )}
      </div>
    </PortalLayout>
  )
}

function ActivePacksSection({ packs }: { packs: LessonPackPurchase[] }) {
  return (
    <section aria-labelledby="active-packs-heading">
      <div className="flex items-end justify-between border-b border-champagne-200 pb-3 mb-5">
        <h2
          id="active-packs-heading"
          className="font-serif text-2xl text-charcoal-950 tracking-tight"
        >
          Active packs
        </h2>
        <span className="text-xs uppercase tracking-[0.18em] text-charcoal-500 tabular-nums">
          {packs.length} {packs.length === 1 ? 'pack' : 'packs'}
        </span>
      </div>
      <ul className="divide-y divide-champagne-200">
        {packs.map((pack) => {
          const lessonCount = pack.lesson_packs?.lesson_count
          const name =
            pack.lesson_packs?.name ||
            (lessonCount !== undefined ? `${lessonCount}-pack` : 'Lesson pack')
          return (
            <li
              key={pack.id}
              className="py-4 flex items-baseline justify-between gap-6"
            >
              <div className="min-w-0">
                <p className="text-base text-charcoal-900">{name}</p>
                <p className="mt-1 text-sm text-charcoal-500 tabular-nums">
                  {lessonCount !== undefined &&
                    `${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`}
                  {pack.expires_at && (
                    <>
                      {lessonCount !== undefined && <span> · </span>}
                      expires {formatDate(pack.expires_at)}
                    </>
                  )}
                </p>
              </div>
              <p className="shrink-0 text-sm text-charcoal-700 tabular-nums">
                {pack.remaining_lessons}
                {lessonCount !== undefined && (
                  <span className="text-charcoal-300"> / {lessonCount}</span>
                )}{' '}
                left
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PaymentsSection({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string
  title: string
  eyebrow?: string
  children: React.ReactNode
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-end justify-between border-b border-champagne-200 pb-3 mb-5">
        <h2
          id={id}
          className="font-serif text-2xl text-charcoal-950 tracking-tight"
        >
          {title}
        </h2>
        {eyebrow && (
          <span className="text-xs uppercase tracking-[0.18em] text-charcoal-500 tabular-nums">
            {eyebrow}
          </span>
        )}
      </div>
      <ul className="divide-y divide-champagne-200">{children}</ul>
    </section>
  )
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const isUsed = transaction.type === 'lesson_used'
  const isPending = transaction.type === 'payment' && transaction.status === 'pending'
  const isPaid = transaction.type === 'payment' && transaction.status === 'confirmed'

  return (
    <li className="py-4 flex items-baseline justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-base text-charcoal-900 truncate">{transaction.title}</p>
        <p className="mt-1 text-sm text-charcoal-500 tabular-nums">
          {formatDate(transaction.date)}
          {transaction.subtitle && <span> · {transaction.subtitle}</span>}
        </p>
      </div>
      <div className="shrink-0 flex items-baseline gap-4 text-sm tabular-nums">
        {isUsed ? (
          <span className="text-charcoal-500 tracking-wide">lesson drawn</span>
        ) : (
          <>
            {transaction.amount !== undefined && (
              <span className="text-charcoal-900">{formatPrice(transaction.amount)}</span>
            )}
            {isPending && <StatusDot tone="attention" label="Outstanding" />}
            {isPaid && <StatusDot tone="positive" label="Paid" />}
          </>
        )}
        {transaction.receipt_url && (
          <a
            href={transaction.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
          >
            receipt
          </a>
        )}
      </div>
    </li>
  )
}
