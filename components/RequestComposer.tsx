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

const PLACEHOLDER_PROMPT = 'Kicks, turns, strength…'
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
    <form
      onSubmit={handleSubmit}
      aria-label="Request a private lesson"
      className="rounded-lg border border-champagne-200 bg-champagne-50 p-5"
    >
      <Textarea
        name="focus"
        label="What do you want to work on?"
        value={focus}
        onChange={(e) => {
          setFocus(e.target.value)
          if (focusError) setFocusError(null)
        }}
        placeholder={PLACEHOLDER_PROMPT}
        rows={3}
        error={focusError ?? undefined}
      />

      {showOptional && (
        <div id="composer-optional" className="mt-4 grid gap-4 md:grid-cols-2 animate-fadeIn">
          <Input
            name="preferred_dates"
            label="When works for you?"
            placeholder="Tuesday afternoon, weekend mornings"
            value={preferredDates}
            onChange={(e) => setPreferredDates(e.target.value)}
            helperText="Separate multiple with commas."
          />
          <Input
            name="additional_notes"
            label="Anything else?"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
          />
        </div>
      )}

      <CostLine balance={balance} costMode={costMode} dayOfPrice={dayOfPrice} onAddPack={onAddPack} />

      <div className="mt-4 flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="self-start text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
          aria-expanded={showOptional}
          aria-controls="composer-optional"
        >
          {showOptional ? 'hide dates and notes' : 'add preferred dates or notes'}
        </button>
        <Button
          type="submit"
          variant="primary"
          disabled={submitting}
          className="w-full md:w-auto min-h-control"
        >
          {sendLabel}
        </Button>
      </div>
    </form>
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
        No lessons on your packs, so this one is{' '}
        <span className="text-charcoal-900 font-medium tabular-nums">{priceLabel}</span>
        , paid the day of by Venmo or cash. Or{' '}
        <button
          type="button"
          onClick={onAddPack}
          className="text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
        >
          buy a pack
        </button>
        {' '}first.
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
