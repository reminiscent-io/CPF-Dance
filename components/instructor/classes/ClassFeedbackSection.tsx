'use client'

import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { FEEDBACK_SHORT_LABELS, FEEDBACK_TEXT_FIELDS, type FeedbackTextField } from '@/lib/class-feedback'
import { ET } from './class-helpers'

type FeedbackRow = {
  id: string
  name: string | null
  rating: number | null
  show_name: boolean
  created_at: string
  student_id: string | null
} & Record<FeedbackTextField, string | null>

interface ClassFeedbackSectionProps {
  classId: string
  title: string
}

const linkButton =
  'shrink-0 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-50'

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-gold-600 tracking-[0.1em]" aria-label={`${rating} of 5 stars`}>
      {'★'.repeat(rating)}
      <span className="text-champagne-300">{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

/**
 * The class's feedback: the no-login link to text or email out, and what's
 * come back. For a workshop it covers every day. Minted on open, like the
 * signup link, so Copy works on the first tap.
 */
export function ClassFeedbackSection({ classId, title }: ClassFeedbackSectionProps) {
  const { addToast } = useToast()

  const { data: token, loading: loadingToken } = useAsyncData(
    async signal => {
      const response = await fetch(`/api/classes/${classId}/feedback-link`, { method: 'POST', signal })
      if (!response.ok) throw new Error('Could not create feedback link')
      const { token } = await response.json()
      return token as string
    },
    [classId]
  )
  const { data: feedback } = useAsyncData(
    async signal => {
      const response = await fetch(`/api/classes/${classId}/feedback`, { signal })
      if (!response.ok) throw new Error('Could not load feedback')
      const { feedback } = await response.json()
      return feedback as FeedbackRow[]
    },
    [classId]
  )

  const link = token ? `${window.location.origin}/feedback/${token}` : null
  const rated = (feedback || []).filter(row => row.rating !== null)
  const average = rated.length > 0 ? rated.reduce((sum, row) => sum + row.rating!, 0) / rated.length : null
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      addToast('Feedback link copied to clipboard', 'success')
    } catch {
      addToast('Could not copy link', 'error')
    }
  }

  const share = async () => {
    if (!link) return
    try {
      await navigator.share({ title: `Feedback: ${title}`, text: `How was ${title}? Tell me here:`, url: link })
    } catch {
      // Closing the share sheet rejects too; nothing to report
    }
  }

  return (
    <div className="p-3 bg-champagne-100 border border-champagne-200 rounded-lg space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="block text-sm font-medium text-charcoal-700">Feedback link</label>
        {feedback && feedback.length > 0 && (
          <span className="text-xs tabular-nums text-charcoal-500">
            {feedback.length} {feedback.length === 1 ? 'response' : 'responses'}
            {average !== null && <> · {average.toFixed(1)} ★</>}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-sm text-charcoal-700">
          {loadingToken ? 'Creating link…' : link ?? 'Link unavailable'}
        </span>
        {canShare && (
          <button type="button" disabled={!link} onClick={share} className={linkButton}>
            Share
          </button>
        )}
        <button type="button" disabled={!link} onClick={copy} className={linkButton}>
          Copy
        </button>
      </div>
      <p className="text-xs text-charcoal-500">
        Text or email this to dancers. No sign-in needed. Signed-in dancers can also leave feedback from their schedule.
      </p>

      {feedback && feedback.length > 0 && (
        <ul className="divide-y divide-champagne-200 border-t border-champagne-200">
          {feedback.map(row => {
            const answers = FEEDBACK_TEXT_FIELDS.filter(field => row[field])
            return (
              <li key={row.id}>
                <details className="group py-2">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 [&::-webkit-details-marker]:hidden">
                    <span className="truncate text-sm font-medium text-charcoal-950">
                      {row.name || 'Anonymous'}
                      {/* Whether her name may go on the website with this */}
                      {row.name && (
                        <span className="ml-2 text-xs font-normal text-charcoal-500">
                          {row.show_name ? 'name OK to use' : 'keep anonymous'}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-charcoal-500">
                      {row.rating !== null && <Stars rating={row.rating} />}
                      {new Date(row.created_at).toLocaleDateString('en-US', { timeZone: ET, month: 'short', day: 'numeric' })}
                      <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  {answers.length > 0 ? (
                    <dl className="mt-2 space-y-2">
                      {answers.map(field => (
                        <div key={field}>
                          <dt className="text-xs text-charcoal-500">{FEEDBACK_SHORT_LABELS[field]}</dt>
                          <dd className="whitespace-pre-line text-sm text-charcoal-900">{row[field]}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="mt-2 text-xs text-charcoal-500">Stars only, no comments.</p>
                  )}
                </details>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
