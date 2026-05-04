'use client'

import { useState } from 'react'

export interface ScheduledClass {
  id: string
  title: string
  start_time: string
  end_time: string
}

export interface LessonRequest {
  id: string
  requested_focus: string | null
  preferred_dates: string[] | null
  additional_notes: string | null
  status: string
  instructor_response: string | null
  instructor_id: string | null
  scheduled_class_id: string | null
  scheduled_class: ScheduledClass | null
  created_at: string
  updated_at: string
}

export interface InFlightSectionProps {
  requests: LessonRequest[]
  loading: boolean
  onRequestDelete: (id: string) => void
  deletingId: string | null
}

type Bucket = 'awaiting' | 'scheduled' | 'past'

function bucketFor(req: LessonRequest): Bucket {
  if (req.status === 'declined' || req.status === 'completed') return 'past'
  if (req.scheduled_class) {
    const start = new Date(req.scheduled_class.start_time).getTime()
    return start >= Date.now() ? 'scheduled' : 'past'
  }
  return 'awaiting'
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric'
  })
}

function formatScheduledEyebrow(start: string, title?: string): string {
  const d = new Date(start)
  const date = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York'
  })
  return `Confirmed · ${date}, ${time} ET${title ? ` · ${title}` : ''}`
}

export function InFlightSection({
  requests,
  loading,
  onRequestDelete,
  deletingId
}: InFlightSectionProps) {
  const [showPast, setShowPast] = useState(false)

  const awaiting = requests.filter((r) => bucketFor(r) === 'awaiting')
  const scheduled = requests.filter((r) => bucketFor(r) === 'scheduled')
  const past = requests.filter((r) => bucketFor(r) === 'past')

  if (loading) {
    return (
      <section aria-label="Your in-flight requests" className="space-y-3">
        <div className="h-6 w-32 rounded bg-champagne-100 animate-pulse" aria-hidden />
        <div className="h-20 rounded bg-champagne-100 animate-pulse" aria-hidden />
        <span className="sr-only">Loading your requests</span>
      </section>
    )
  }

  if (requests.length === 0) {
    return (
      <section aria-labelledby="in-flight-empty">
        <h2
          id="in-flight-empty"
          className="font-serif text-2xl text-charcoal-950 tracking-tight"
        >
          Nothing in flight yet.
        </h2>
        <p className="mt-2 text-base text-charcoal-500">
          Send your first request above.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="in-flight-heading" className="space-y-10">
      <h2 id="in-flight-heading" className="sr-only">
        In flight
      </h2>

      {awaiting.length > 0 && (
        <RequestGroup
          title="Awaiting reply"
          requests={awaiting}
          onRequestDelete={onRequestDelete}
          deletingId={deletingId}
          eyebrow={(r) => `Sent ${formatShortDate(r.created_at)} · awaiting reply`}
        />
      )}

      {scheduled.length > 0 && (
        <RequestGroup
          title="Scheduled"
          requests={scheduled}
          onRequestDelete={onRequestDelete}
          deletingId={deletingId}
          eyebrow={(r) =>
            r.scheduled_class
              ? formatScheduledEyebrow(r.scheduled_class.start_time, r.scheduled_class.title)
              : `Confirmed · ${formatShortDate(r.created_at)}`
          }
        />
      )}

      {past.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
            aria-expanded={showPast}
            aria-controls="past-requests"
          >
            {showPast ? 'hide past requests' : `see past requests (${past.length})`}
          </button>
          {showPast && (
            <div id="past-requests" className="mt-6 animate-fadeIn">
              <RequestGroup
                title="Past"
                requests={past}
                onRequestDelete={onRequestDelete}
                deletingId={deletingId}
                eyebrow={(r) => {
                  if (r.status === 'declined') {
                    return `${formatShortDate(r.created_at)} · declined`
                  }
                  if (r.scheduled_class) {
                    return `${formatShortDate(r.scheduled_class.start_time)} · completed`
                  }
                  return `${formatShortDate(r.created_at)} · past`
                }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

interface RequestGroupProps {
  title: string
  requests: LessonRequest[]
  onRequestDelete: (id: string) => void
  deletingId: string | null
  eyebrow: (r: LessonRequest) => string
}

function RequestGroup({
  title,
  requests,
  onRequestDelete,
  deletingId,
  eyebrow
}: RequestGroupProps) {
  return (
    <div>
      <h3 className="font-serif text-xl text-charcoal-950 tracking-tight mb-4">
        {title}
      </h3>
      <ul className="divide-y divide-champagne-200 border-t border-champagne-200">
        {requests.map((r) => (
          <RequestEntry
            key={r.id}
            request={r}
            eyebrow={eyebrow(r)}
            onDelete={() => onRequestDelete(r.id)}
            isDeleting={deletingId === r.id}
          />
        ))}
      </ul>
    </div>
  )
}

interface RequestEntryProps {
  request: LessonRequest
  eyebrow: string
  onDelete: () => void
  isDeleting: boolean
}

function RequestEntry({ request, eyebrow, onDelete, isDeleting }: RequestEntryProps) {
  const [expanded, setExpanded] = useState(false)

  const hasOptional =
    (request.preferred_dates && request.preferred_dates.length > 0) ||
    !!request.additional_notes
  const canExpand = hasOptional

  return (
    <li className="py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base text-charcoal-700 italic tracking-tight">
            {eyebrow}
          </p>
          <p
            className={`mt-2 text-base text-charcoal-900 leading-relaxed ${
              expanded ? '' : 'line-clamp-2'
            }`}
          >
            {request.requested_focus}
          </p>

          {expanded && hasOptional && (
            <dl className="mt-3 space-y-2 text-sm animate-fadeIn">
              {request.preferred_dates && request.preferred_dates.length > 0 && (
                <div>
                  <dt className="text-charcoal-500 tracking-wide">when works for you</dt>
                  <dd className="text-charcoal-900 mt-0.5">
                    {request.preferred_dates.join(', ')}
                  </dd>
                </div>
              )}
              {request.additional_notes && (
                <div>
                  <dt className="text-charcoal-500 tracking-wide">notes</dt>
                  <dd className="text-charcoal-900 mt-0.5 whitespace-pre-wrap">
                    {request.additional_notes}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {canExpand && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
              aria-expanded={expanded}
            >
              {expanded ? 'show less' : 'show details'}
            </button>
          )}

          {request.instructor_response && (
            <CourtneyReply text={request.instructor_response} />
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="shrink-0 text-sm text-charcoal-500 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 -mr-3 -mt-2 transition-colors"
          aria-label="Delete this request"
        >
          {isDeleting ? 'deleting…' : 'delete'}
        </button>
      </div>
    </li>
  )
}

interface CourtneyReplyProps {
  text: string
}

function CourtneyReply({ text }: CourtneyReplyProps) {
  return (
    <blockquote
      className="mt-4 pl-4"
      style={{ borderLeft: '3px solid var(--color-rose-600)' }}
    >
      <p className="font-serif italic text-base text-charcoal-700 mb-1 tracking-tight">
        Courtney —
      </p>
      <p className="text-base text-charcoal-900 leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    </blockquote>
  )
}
