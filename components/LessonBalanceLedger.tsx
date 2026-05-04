'use client'

import { Button } from '@/components/ui/Button'

export interface LessonBalanceLedgerProps {
  totalRemaining: number
  earliestExpiryDate?: string | null
  earliestExpiryCount?: number
  loading?: boolean
  onShowHistory: () => void
  onAddPack: () => void
}

const SOON_EXPIRY_DAYS = 30

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime()
  const now = Date.now()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function formatExpiryDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

export function LessonBalanceLedger({
  totalRemaining,
  earliestExpiryDate,
  earliestExpiryCount,
  loading = false,
  onShowHistory,
  onAddPack
}: LessonBalanceLedgerProps) {
  if (loading) {
    return (
      <div className="lg:text-right">
        <div className="h-12 w-16 lg:ml-auto rounded bg-champagne-100 animate-pulse" aria-hidden />
        <div className="mt-2 h-4 w-40 lg:ml-auto rounded bg-champagne-100 animate-pulse" aria-hidden />
        <span className="sr-only">Loading lesson balance</span>
      </div>
    )
  }

  if (totalRemaining === 0) {
    return (
      <div className="lg:text-right">
        <p className="font-serif text-2xl md:text-3xl text-charcoal-950 leading-tight tracking-tight">
          No lessons on your pack.
        </p>
        <div className="mt-4 flex lg:justify-end">
          <Button variant="gold" size="md" onClick={onAddPack}>
            Add a pack
          </Button>
        </div>
        <button
          type="button"
          onClick={onShowHistory}
          className="mt-3 text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline tracking-wide transition-colors"
        >
          see history
        </button>
      </div>
    )
  }

  const isLastOne = totalRemaining === 1
  const expiringSoon =
    earliestExpiryDate &&
    earliestExpiryCount &&
    earliestExpiryCount > 0 &&
    daysUntil(earliestExpiryDate) <= SOON_EXPIRY_DAYS &&
    daysUntil(earliestExpiryDate) >= 0

  return (
    <div className="lg:text-right">
      <p
        className="font-serif text-5xl md:text-6xl text-charcoal-950 leading-none tracking-tight tabular-nums"
        aria-label={`${totalRemaining} ${totalRemaining === 1 ? 'lesson' : 'lessons'} remaining on your current pack`}
      >
        {totalRemaining}
      </p>
      <p className="mt-2 text-sm text-charcoal-500 tracking-wide">
        {isLastOne ? 'lesson left on your current pack' : 'lessons left on your current pack'}
        {isLastOne && (
          <span className="ml-2 text-gold-700">· last one</span>
        )}
      </p>
      {expiringSoon && (
        <p className="mt-1 text-sm text-rose-700 tracking-wide">
          {earliestExpiryCount} expire{earliestExpiryCount === 1 ? 's' : ''} {formatExpiryDate(earliestExpiryDate!)}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 lg:justify-end">
        <button
          type="button"
          onClick={onAddPack}
          className="text-sm text-gold-700 hover:text-gold-800 underline-offset-4 hover:underline tracking-wide transition-colors"
        >
          buy more
        </button>
        <span aria-hidden className="text-charcoal-300">·</span>
        <button
          type="button"
          onClick={onShowHistory}
          className="text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline tracking-wide transition-colors"
        >
          see history
        </button>
      </div>
    </div>
  )
}
