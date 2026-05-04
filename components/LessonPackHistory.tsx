'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'

interface PurchaseRow {
  id: string
  student_id: string
  lesson_pack_id: string
  remaining_lessons: number
  purchased_at: string
  lesson_pack?: {
    id: string
    name: string
    lesson_count: number
    price: number
  }
}

interface UsageRow {
  id: string
  lesson_pack_purchase_id: string
  private_lesson_request_id?: string
  lessons_used: number
  used_at: string
  cost_mode?: 'standard' | 'free' | 'discounted'
  discount_amount?: number | null
  private_lesson_requests?: {
    id: string
    status: string
    requested_focus?: string
    created_at: string
  }
}

interface LessonPackHistoryProps {
  isOpen: boolean
  onClose: () => void
}

const PACK_VALIDITY_MONTHS = 12

function addMonths(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

export function LessonPackHistory({ isOpen, onClose }: LessonPackHistoryProps) {
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [usage, setUsage] = useState<UsageRow[]>([])
  const [totalRemaining, setTotalRemaining] = useState(0)
  const [expandedUsageId, setExpandedUsageId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dancer/lesson-packs/history')
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases || [])
        setUsage(data.usage || [])
        setTotalRemaining(data.totalRemaining || 0)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  const purchasesFifo = [...purchases].sort(
    (a, b) => new Date(a.purchased_at).getTime() - new Date(b.purchased_at).getTime()
  )
  const usageDesc = [...usage].sort(
    (a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime()
  )
  const purchaseById = new Map(purchases.map((p) => [p.id, p]))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pack history" size="xl">
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" color="rose" />
        </div>
      ) : (
        <div className="space-y-10">
          <header>
            <p className="text-sm text-charcoal-500 tracking-wide">total remaining</p>
            <p className="font-serif text-4xl text-charcoal-950 tracking-tight tabular-nums mt-1">
              {totalRemaining}
            </p>
          </header>

          <section aria-labelledby="purchases-heading">
            <h3
              id="purchases-heading"
              className="font-serif text-xl text-charcoal-950 tracking-tight mb-4"
            >
              Purchases
            </h3>
            {purchasesFifo.length === 0 ? (
              <p className="text-sm text-charcoal-500">No purchases yet.</p>
            ) : (
              <PurchasesTable rows={purchasesFifo} />
            )}
          </section>

          <section aria-labelledby="usage-heading">
            <h3
              id="usage-heading"
              className="font-serif text-xl text-charcoal-950 tracking-tight mb-4"
            >
              Lessons used
            </h3>
            {usageDesc.length === 0 ? (
              <p className="text-sm text-charcoal-500">No lessons used yet.</p>
            ) : (
              <UsageTable
                rows={usageDesc}
                purchaseById={purchaseById}
                expandedId={expandedUsageId}
                onToggleExpand={(id) => setExpandedUsageId((prev) => (prev === id ? null : id))}
              />
            )}
          </section>
        </div>
      )}
    </Modal>
  )
}

interface PurchasesTableProps {
  rows: PurchaseRow[]
}

function PurchasesTable({ rows }: PurchasesTableProps) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-champagne-200">
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-left py-2 pr-4">
              Date
            </th>
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-left py-2 pr-4">
              Pack
            </th>
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-right py-2 pr-4 tabular-nums">
              Price
            </th>
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-left py-2 pr-4">
              Expires
            </th>
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-right py-2 tabular-nums">
              Remaining
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const used = row.lesson_pack ? row.lesson_pack.lesson_count - row.remaining_lessons : 0
            const exhausted = row.remaining_lessons === 0
            const expiry = addMonths(row.purchased_at, PACK_VALIDITY_MONTHS)
            const rowText = exhausted ? 'text-charcoal-300' : 'text-charcoal-900'
            return (
              <tr key={row.id} className="border-b border-champagne-200 last:border-b-0">
                <td className={`py-3 pr-4 tabular-nums ${rowText}`}>
                  {formatDate(row.purchased_at)}
                </td>
                <td className={`py-3 pr-4 ${rowText}`}>
                  {row.lesson_pack ? `${row.lesson_pack.lesson_count}-pack` : '—'}
                </td>
                <td className={`py-3 pr-4 text-right tabular-nums ${rowText}`}>
                  {row.lesson_pack ? formatPrice(row.lesson_pack.price) : '—'}
                </td>
                <td className={`py-3 pr-4 tabular-nums ${rowText}`}>{formatDate(expiry)}</td>
                <td className={`py-3 text-right tabular-nums ${rowText}`}>
                  {row.remaining_lessons}
                  {row.lesson_pack && (
                    <span className="text-charcoal-300"> / {row.lesson_pack.lesson_count}</span>
                  )}
                  {used > 0 && row.remaining_lessons > 0 && (
                    <span className="sr-only"> ({used} used)</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface UsageTableProps {
  rows: UsageRow[]
  purchaseById: Map<string, PurchaseRow>
  expandedId: string | null
  onToggleExpand: (id: string) => void
}

function UsageTable({ rows, purchaseById, expandedId, onToggleExpand }: UsageTableProps) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-champagne-200">
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-left py-2 pr-4">
              Lesson date
            </th>
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-left py-2 pr-4">
              Focus
            </th>
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-left py-2 pr-4">
              Drawn from
            </th>
            <th className="font-serif text-base text-charcoal-700 tracking-tight font-medium text-right py-2">
              Cost
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const purchase = purchaseById.get(row.lesson_pack_purchase_id)
            const focus = row.private_lesson_requests?.requested_focus ?? '—'
            const isExpanded = expandedId === row.id
            const mode = row.cost_mode ?? 'standard'
            const lessonsUsed = row.lessons_used || 1
            return (
              <tr key={row.id} className="border-b border-champagne-200 last:border-b-0 align-top">
                <td className="py-3 pr-4 tabular-nums text-charcoal-900">
                  {formatDate(row.used_at)}
                </td>
                <td className="py-3 pr-4 text-charcoal-900 max-w-[24rem]">
                  <button
                    type="button"
                    onClick={() => onToggleExpand(row.id)}
                    className={`text-left w-full ${
                      isExpanded ? '' : 'truncate'
                    } hover:text-rose-700 transition-colors`}
                    aria-expanded={isExpanded}
                  >
                    {focus}
                  </button>
                </td>
                <td className="py-3 pr-4 text-charcoal-500 tabular-nums">
                  {purchase ? formatDate(purchase.purchased_at) : '—'}
                </td>
                <td className="py-3 text-right text-charcoal-900 tabular-nums">
                  <UsageCost mode={mode} lessons={lessonsUsed} discountAmount={row.discount_amount} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

interface UsageCostProps {
  mode: 'standard' | 'free' | 'discounted'
  lessons: number
  discountAmount?: number | null
}

function UsageCost({ mode, lessons, discountAmount }: UsageCostProps) {
  if (mode === 'free') {
    return <span className="text-gold-700">on the house</span>
  }
  if (mode === 'discounted') {
    return (
      <span>
        {lessons} lesson{lessons === 1 ? '' : 's'}
        {discountAmount != null && (
          <span className="text-charcoal-500"> · −{formatPrice(discountAmount)}</span>
        )}
      </span>
    )
  }
  return (
    <span>
      {lessons} lesson{lessons === 1 ? '' : 's'}
    </span>
  )
}
