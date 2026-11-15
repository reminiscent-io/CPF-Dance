'use client'

import { useState, type FormEvent } from 'react'
import { Button, Input, Textarea } from '@/components/ui'
import { StarRating } from './StarRating'
import {
  FEEDBACK_TEXT_FIELDS,
  MAX_FEEDBACK_NAME,
  MAX_FEEDBACK_TEXT,
  feedbackPrompts,
  type FeedbackHeading,
  type FeedbackTextField,
} from '@/lib/class-feedback'

export type FeedbackDraft = { rating: number | null } & Partial<Record<FeedbackTextField, string | null>>

export interface FeedbackFormProps {
  heading: FeedbackHeading
  /** Where the form POSTs */
  submitUrl: string
  /** The no-login link asks for a name; the portal already knows it */
  askName: boolean
  /** A response sent before, to edit */
  initial?: FeedbackDraft | null
}

const emptyAnswers = (): Record<FeedbackTextField, string> =>
  Object.fromEntries(FEEDBACK_TEXT_FIELDS.map(field => [field, ''])) as Record<FeedbackTextField, string>

/**
 * The feedback form, shared by the no-login link and the dancer portal: the
 * class's title and dates, a name (link only), five optional questions and a
 * star rating. Nothing is required, but an empty form has nothing to send.
 */
export function FeedbackForm({ heading, submitUrl, askName, initial }: FeedbackFormProps) {
  const [name, setName] = useState('')
  const [answers, setAnswers] = useState<Record<FeedbackTextField, string>>(() => {
    const filled = emptyAnswers()
    for (const field of FEEDBACK_TEXT_FIELDS) filled[field] = initial?.[field] ?? ''
    return filled
  })
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null)
  // Bots fill every field; people never see this one
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const prompts = feedbackPrompts(heading.classType, heading.instructorName)
  const firstName = heading.instructorName?.trim().split(/\s+/)[0] || null
  const isEdit = !!initial
  const hasSomething = rating !== null || FEEDBACK_TEXT_FIELDS.some(field => answers[field].trim())

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!hasSomething) {
      setError('Add a star rating or a few words first')
      return
    }
    setSending(true)
    setError(null)
    try {
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, rating, website, ...answers }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Could not send your feedback. Please try again.')
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your feedback. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const header = (
    <header>
      <p className="text-sm font-medium tracking-[0.04em] text-charcoal-500">Feedback</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-charcoal-950">{heading.title}</h1>
      <p className="mt-1 text-charcoal-700">
        {heading.dates}
        {heading.instructorName && <span className="text-charcoal-500"> · with {heading.instructorName}</span>}
      </p>
    </header>
  )

  if (sent) {
    return (
      <div className="animate-fadeIn">
        {header}
        <div className="mt-8 border-t border-champagne-200 pt-8 text-center">
          <h2 className="font-display text-3xl font-semibold italic tracking-tight text-rose-700">Thank you</h2>
          <p className="mx-auto mt-2 max-w-sm text-charcoal-700">
            {firstName ? `${firstName} reads every word.` : 'Every word gets read.'} It helps make the next session even better.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {header}
      <p className="mt-4 text-sm text-charcoal-500">
        Everything is optional. Say as much or as little as you like.
      </p>

      <div className="mt-6 space-y-6 border-t border-champagne-200 pt-6">
        {askName && (
          <Input
            label="Your name"
            name="name"
            autoComplete="name"
            maxLength={MAX_FEEDBACK_NAME}
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-base"
          />
        )}

        {prompts.map(({ field, prompt }) => (
          <Textarea
            key={field}
            name={field}
            label={prompt}
            rows={3}
            maxLength={MAX_FEEDBACK_TEXT}
            value={answers[field]}
            onChange={e => setAnswers(prev => ({ ...prev, [field]: e.target.value }))}
            // 16px keeps iOS from zooming in on focus
            className="text-base [field-sizing:content] min-h-[6rem]"
          />
        ))}

        <StarRating value={rating} onChange={setRating} />

        {/* Off-screen, not display:none, so naive bots still fill it in */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
          </label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}

        <Button type="submit" loading={sending} className="w-full">
          {isEdit ? 'Update feedback' : 'Send feedback'}
        </Button>
      </div>
    </form>
  )
}
