'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { StripePaymentDialog } from '@/components/StripePaymentDialog'
import type { LessonPack } from '@/lib/types'

interface LessonPackSelectorProps {
  instructorId?: string | null
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price)

// Every pack sits on one row from desktop up; four or more fold to a 2×2 below it.
function gridCols(count: number): string {
  if (count <= 1) return 'grid-cols-1 max-w-xs'
  if (count === 2) return 'grid-cols-2'
  if (count === 3) return 'grid-cols-1 sm:grid-cols-3'
  return 'grid-cols-2 lg:grid-cols-4'
}

/**
 * The pack shelf on the Private Lessons page. Buying hands off to Stripe
 * Checkout, which returns to the page with `?success=true`.
 */
export function LessonPackSelector({ instructorId }: LessonPackSelectorProps) {
  const [packs, setPacks] = useState<LessonPack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPack, setSelectedPack] = useState<LessonPack | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch('/api/dancer/lesson-packs')
      .then((response) => {
        if (!response.ok) throw new Error('Could not load lesson packs.')
        return response.json()
      })
      .then((data) => {
        if (!cancelled) setPacks(data.packs || [])
      })
      .catch((err) => {
        console.error('Error fetching packs:', err)
        if (!cancelled) setError('Could not load lesson packs.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const handlePurchase = (pack: LessonPack) => {
    if (!instructorId) {
      setError('We need to know your instructor before processing a purchase. Try refreshing.')
      return
    }
    setError('')
    setSelectedPack(pack)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rectangular" height={208} />
        ))}
        <span className="sr-only">Loading lesson packs</span>
      </div>
    )
  }

  const bestRate = packs.length > 1
    ? Math.min(...packs.map((p) => p.price / p.lesson_count))
    : null
  // Savings are measured against the smallest pack's per-lesson price
  // (the single lesson), so every bigger pack shows what it saves. Rounded
  // down so it never overstates; the epsilon absorbs float error (100/125).
  const smallest = packs[0]
  const baseRate = smallest ? smallest.price / smallest.lesson_count : null

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-champagne-50 px-4 py-3 text-sm text-charcoal-900">
          {error}
        </div>
      )}

      {packs.length === 0 && !error ? (
        <p className="text-sm text-charcoal-500">
          No packs are on sale right now. Send Courtney a request below and she’ll sort out payment with you.
        </p>
      ) : (
        <ul className={`grid gap-4 ${gridCols(packs.length)}`}>
          {packs.map((pack) => {
            const perLesson = pack.price / pack.lesson_count
            const isBestRate = bestRate !== null && perLesson === bestRate
            const savePercent = baseRate ? Math.floor((1 - perLesson / baseRate) * 100 + 1e-9) : 0
            return (
              <li
                key={pack.id}
                className={`flex flex-col rounded-lg border bg-champagne-50 p-5 text-center ${
                  isBestRate ? 'border-gold-400' : 'border-champagne-200'
                }`}
              >
                <p className="font-serif text-5xl text-charcoal-950 leading-none tracking-[-0.03em] tabular-nums">
                  {pack.lesson_count}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-charcoal-500">
                  {pack.lesson_count === 1 ? 'lesson' : 'lessons'}
                </p>
                <p className="mt-5 font-serif text-2xl text-charcoal-950 tracking-tight tabular-nums">
                  {formatPrice(pack.price)}
                </p>
                <p
                  className={`mt-1 text-xs tabular-nums tracking-wide ${
                    isBestRate ? 'text-gold-700' : 'text-charcoal-500'
                  }`}
                >
                  {formatPrice(perLesson)} each
                  {savePercent > 0 && <span className="block">save {savePercent}%{isBestRate && ' · best rate'}</span>}
                </p>
                <div className="mt-auto pt-5">
                  <Button
                    variant={isBestRate ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handlePurchase(pack)}
                    className="w-full min-h-control"
                    aria-label={`Buy ${pack.lesson_count === 1 ? '1 lesson' : `${pack.lesson_count} lessons`} for ${formatPrice(pack.price)}`}
                  >
                    Buy
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <StripePaymentDialog
        isOpen={!!selectedPack}
        onClose={() => setSelectedPack(null)}
        lessonPack={selectedPack}
        instructorId={instructorId || null}
      />
    </div>
  )
}
