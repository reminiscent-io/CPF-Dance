/**
 * Class series: the days of a multi-day workshop (or any recurring batch)
 * share a `series_id`. These helpers keep the rules for what a series shares
 * in one place, for the API routes and the instructor UI alike.
 */

// Fields that describe the series as a whole. Start/end times, cancellation,
// attendance and the Meet link stay per-day.
export const SERIES_SHARED_FIELDS = [
  'instructor_id',
  'studio_id',
  'class_type',
  'title',
  'description',
  'location',
  'max_capacity',
  'price',
  'pricing_model',
  'base_cost',
  'cost_per_person',
  'cost_per_hour',
  'tiered_base_students',
  'tiered_additional_cost',
  'external_signup_url',
  'is_public',
  'asset_id',
  'workshop_price',
  'workshop_signup_url',
  'workshop_full_only',
] as const

/** The subset of a class update that should carry over to the other days. */
export function pickSeriesFields(update: Record<string, unknown>): Record<string, unknown> {
  const shared: Record<string, unknown> = {}
  for (const field of SERIES_SHARED_FIELDS) {
    if (field in update) shared[field] = update[field]
  }
  return shared
}

export interface SeriesPosition {
  series_position: number
  series_total: number
}

/** 1-based position of each class within its series, ordered by start time. */
export function seriesPositions(
  rows: { id: string; series_id: string | null; start_time: string }[]
): Map<string, SeriesPosition> {
  const bySeries = new Map<string, { id: string; start_time: string }[]>()
  for (const row of rows) {
    if (!row.series_id) continue
    const list = bySeries.get(row.series_id) ?? []
    list.push(row)
    bySeries.set(row.series_id, list)
  }

  const positions = new Map<string, SeriesPosition>()
  for (const list of bySeries.values()) {
    if (list.length < 2) continue
    list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    list.forEach((row, index) => {
      positions.set(row.id, { series_position: index + 1, series_total: list.length })
    })
  }
  return positions
}

/** "Day 2 of 3" for workshops, "2 of 12" for other repeated classes. */
export function seriesLabel(classType: string, position: SeriesPosition): string {
  const prefix = classType === 'workshop' ? 'Day ' : ''
  return `${prefix}${position.series_position} of ${position.series_total}`
}

export type WorkshopOption = 'full' | 'day'

/**
 * How a dancer can sign up. A linked workshop always sells the full run; a
 * single day is sold unless the instructor marked it full-run only. Anything
 * else is a plain one-class sign-up.
 */
export function workshopOptions(cls: {
  class_type: string
  series_id?: string | null
  workshop_full_only?: boolean | null
}): { full: boolean; day: boolean } {
  if (cls.class_type !== 'workshop' || !cls.series_id) return { full: false, day: true }
  return { full: true, day: !cls.workshop_full_only }
}

/**
 * A full-workshop pass's share of one day's earnings, in cents. The price is
 * split evenly across the days that run; leftover cents go to the earliest
 * days so the shares always add back up to the price.
 */
export function passShareCents(priceCents: number, dayCount: number, dayIndex: number): number {
  if (dayCount <= 0) return 0
  const base = Math.floor(priceCents / dayCount)
  return base + (dayIndex < priceCents % dayCount ? 1 : 0)
}
