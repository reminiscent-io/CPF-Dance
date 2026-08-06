'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Textarea, Input } from '@/components/ui/Input'

export type CostMode = 'standard' | 'free' | 'discounted'

export interface RequestComposerProps {
  readonly balance: number
  readonly costMode?: CostMode
  readonly submitting: boolean
  readonly onSubmit: (data: {
    focus: string
    preferredDates: string[]
    additionalNotes: string | null
  }) => Promise<void> | void
  readonly onAddPack: () => void
}

const PLACEHOLDER_PROMPT = 'Adagio extension, my left fouetté turn, the variation from Coppélia Act II…'
const ERROR_EMPTY_FOCUS = "Tell Courtney what you'd like to work on."

export function RequestComposer({
  balance,
  costMode = 'standard',
  submitting,
  onSubmit,
  onAddPack
}: RequestComposerProps) {
  const [focus, setFocus] = useState('')
  const [preferredDates, setPreferredDates] = useState('')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [focusError, setFocusError] = useState<string | null>(null)
  const [dayOfPrice, setDayOfPrice] = useState<number | null>(null)

  useEffect(() => {
    if (balance > 0) return
    let cancelled = false
    fetch('/api/lesson-packs/day-of-price')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.price === 'number') setDayOfPrice(data.price)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [balance])

  const sendLabel = submitting ? 'Sending…' : 'Send to Courtney'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = focus.trim()
    if (!trimmed) {
      setFocusError(ERROR_EMPTY_FOCUS)
      return
    }
    setFocusError(null)

    const datesArray = preferredDates
      .split(',')
      .map((d) => d.trim())
      .filter((d) => d.length > 0)

    await onSubmit({
      focus: trimmed,
      preferredDates: datesArray,
      additionalNotes: additionalNotes.trim() || null
    })

    setFocus('')
    setPreferredDates('')
    setAdditionalNotes('')
    setShowOptional(false)
  }

  return (
    <section
      aria-labelledby="composer-heading"
      className="bg-champagne-50 rounded-lg shadow-soft p-6 md:p-10"
    >
      <h2
        id="composer-heading"
        className="font-serif text-2xl md:text-3xl text-charcoal-950 tracking-tight"
      >
        What do you want to work on?
      </h2>

      <form onSubmit={handleSubmit} className="mt-5 md:mt-6">
        <Textarea
          name="focus"
          value={focus}
          onChange={(e) => {
            setFocus(e.target.value)
            if (focusError) setFocusError(null)
          }}
          placeholder={PLACEHOLDER_PROMPT}
          rows={5}
          aria-label="What do you want to work on?"
          error={focusError ?? undefined}
        />

        <CostLine balance={balance} costMode={costMode} dayOfPrice={dayOfPrice} onAddPack={onAddPack} />

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
            aria-expanded={showOptional}
            aria-controls="composer-optional"
          >
            {showOptional ? 'hide preferred dates and notes' : 'add preferred dates or notes'}
          </button>

          {showOptional && (
            <div id="composer-optional" className="mt-4 space-y-4 animate-fadeIn">
              <Input
                name="preferred_dates"
                label="when works for you?"
                placeholder="Tuesday afternoon, anytime weekend mornings"
                value={preferredDates}
                onChange={(e) => setPreferredDates(e.target.value)}
                helperText="Separate multiple with commas."
              />
              <Textarea
                name="additional_notes"
                label="anything else?"
                rows={3}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse md:flex-row md:items-center md:justify-end md:gap-4">
          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full md:w-auto"
          >
            {sendLabel}
          </Button>
        </div>
      </form>
    </section>
  )
}

interface CostLineProps {
  readonly balance: number
  readonly costMode: CostMode
  readonly dayOfPrice: number | null
  readonly onAddPack: () => void
}

function CostLine({ balance, costMode, dayOfPrice, onAddPack }: CostLineProps) {
  if (balance === 0) {
    const priceLabel = dayOfPrice != null ? `$${dayOfPrice.toFixed(2)}` : 'the single-lesson rate'
    return (
      <p className="mt-3 text-sm text-charcoal-500 leading-relaxed">
        You don’t have credits on a pack right now. 1 credit will be used when Courtney confirms and schedules a lesson —{' '}
        <button
          type="button"
          onClick={onAddPack}
          className="text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
        >
          add a pack
        </button>
        {' '}to refill. Otherwise, this lesson will cost{' '}
        <span className="text-charcoal-900 font-medium tabular-nums">{priceLabel}</span>
        , paid the day of the lesson via Venmo or cash.
      </p>
    )
  }
  if (costMode === 'free') {
    return (
      <p className="mt-3 text-sm text-charcoal-500">
        <span className="text-gold-700 font-medium">On the house</span> for this one.
      </p>
    )
  }
  if (costMode === 'discounted') {
    return (
      <p className="mt-3 text-sm text-charcoal-500">
        1 credit will be used when Courtney confirms and schedules this lesson —{' '}
        <span className="text-charcoal-900 font-medium tabular-nums">
          {balance} {balance === 1 ? 'credit' : 'credits'} on file
        </span>
        , at a discounted rate.
      </p>
    )
  }
  return (
    <p className="mt-3 text-sm text-charcoal-500">
      1 credit will be used when Courtney confirms and schedules this lesson —{' '}
      <span className="text-charcoal-900 font-medium tabular-nums">
        {balance} {balance === 1 ? 'credit' : 'credits'} on file
      </span>
      .
    </p>
  )
}
