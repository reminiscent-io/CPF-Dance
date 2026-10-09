'use client'

import { useMemo } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { formatSession, sessionsFromClasses, type ClassForFacts } from '@/lib/promo/facts'

export interface PickableClass extends ClassForFacts {
  id: string
  title: string
  class_type: string
  start_time: string
  end_time: string
  is_cancelled?: boolean
}

/**
 * Upcoming classes to promote. Pick several for a multi-day workshop that
 * is entered as one class row per day; their dates fill the brief.
 */
export function ClassPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[]
  onChange: (classes: PickableClass[]) => void
}) {
  const { data, loading, error } = useAsyncData<PickableClass[]>(async (signal) => {
    const response = await fetch('/api/classes?upcoming=true', { signal })
    if (!response.ok) throw new Error('Couldn’t load your classes.')
    const body = await response.json()
    return ((body.classes ?? []) as PickableClass[]).filter(
      (cls) => cls.class_type !== 'private' && !cls.is_cancelled && new Date(cls.end_time).getTime() > Date.now()
    )
  }, [])

  const classes = useMemo(() => data ?? [], [data])
  const toggle = (cls: PickableClass) => {
    const ids = selectedIds.includes(cls.id) ? selectedIds.filter((id) => id !== cls.id) : [...selectedIds, cls.id]
    onChange(classes.filter((item) => ids.includes(item.id)))
  }

  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="skeleton-shimmer h-14 rounded-lg" />
        ))}
      </div>
    )
  }
  if (error) return <p className="text-sm text-charcoal-500">{error} You can still type the dates below.</p>
  if (classes.length === 0) {
    return <p className="text-sm text-charcoal-500">No upcoming group classes or workshops. Type the dates below instead.</p>
  }

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto pr-1" aria-label="Upcoming classes">
      {classes.map((cls) => {
        const selected = selectedIds.includes(cls.id)
        const [session] = sessionsFromClasses([cls])
        const when = session ? formatSession(session) : null
        return (
          <li key={cls.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(cls)}
              className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                selected ? 'border-rose-300 bg-ballet-pink-100' : 'border-champagne-200 bg-champagne-50 hover:bg-champagne-100'
              }`}
            >
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
                  selected ? 'border-rose-600 bg-rose-600 text-champagne-50' : 'border-champagne-300'
                }`}
                aria-hidden="true"
              >
                {selected && <CheckIcon className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-charcoal-900">{cls.title}</span>
                {when && (
                  <span className="block text-xs text-charcoal-500">
                    {when.weekday} {when.date}, {when.time}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
