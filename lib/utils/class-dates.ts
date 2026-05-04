/**
 * Editorial date formatters for class lists. Tabular figures, no leading zeroes
 * in time, weekday and month labels chosen for the program-book voice.
 *
 * Two consumer surfaces today:
 *   - The dancer's "My Classes" list (single-column, grouped by week/month).
 *   - The recurring-batch confirmation preview.
 */

const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined

/** "Wed 07 May" — weekday short, day padded, month short. */
export function formatClassDate(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short', timeZone: tz })
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: tz })
  return `${weekday} ${day} ${month}`
}

/** "07 May" — for past sections grouped by month, no weekday repetition. */
export function formatClassDateShort(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: tz })
  return `${day} ${month}`
}

/** "9:00 AM" / "9:30 PM" — no padded hour, lowercase meridiem suppressed by Intl. */
export function formatClassTime(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  })
}

/** "9:00 — 10:30 AM" or "11:30 AM — 1:00 PM" if meridiem differs. */
export function formatTimeRange(start: string | Date, end: string | Date | null): string {
  const startDate = start instanceof Date ? start : new Date(start)
  if (!end) return formatClassTime(startDate)

  const endDate = end instanceof Date ? end : new Date(end)
  const startMer = startDate.getHours() >= 12 ? 'PM' : 'AM'
  const endMer = endDate.getHours() >= 12 ? 'PM' : 'AM'

  if (startMer === endMer) {
    const startStr = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    })
    const endStr = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: tz,
    })
    // Drop redundant leading meridiem on the start side.
    const startNoMer = startStr.replace(/\s?(AM|PM)$/i, '')
    return `${startNoMer} – ${endStr}`
  }

  return `${formatClassTime(startDate)} – ${formatClassTime(endDate)}`
}

/** "1h" / "45m" / "1h 30m" — concise, en-dash-free. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export type ClassGroupKey =
  | 'today'
  | 'tomorrow'
  | 'thisWeek'
  | 'nextWeek'
  | string // "2026-05" for older classes grouped by month

export interface ClassGroup<T> {
  key: ClassGroupKey
  label: string
  items: T[]
}

interface HasStartTime {
  start_time: string
}

/**
 * Group classes by editorial date buckets. Direction controls whether the
 * "rolling" buckets are forward (Today, Tomorrow, This week, Next week, then
 * monthly) or backward (Yesterday, Last week, then monthly descending).
 */
export function groupClassesByDate<T extends HasStartTime>(
  classes: T[],
  direction: 'upcoming' | 'past' = 'upcoming'
): ClassGroup<T>[] {
  if (classes.length === 0) return []

  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const groups = new Map<string, T[]>()
  const labels = new Map<string, string>()

  const ensureGroup = (key: string, label: string, item: T) => {
    labels.set(key, label)
    const list = groups.get(key) ?? []
    list.push(item)
    groups.set(key, list)
  }

  const dayKey = (d: Date) => `day-${d.toISOString().slice(0, 10)}`
  const monthKey = (d: Date) =>
    `month-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  const weekStart = (d: Date) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    x.setDate(x.getDate() - x.getDay())
    return x
  }

  const thisWeekStart = weekStart(startOfToday)
  const nextWeekStart = new Date(thisWeekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const weekAfterNextStart = new Date(nextWeekStart)
  weekAfterNextStart.setDate(weekAfterNextStart.getDate() + 7)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  for (const item of classes) {
    const date = new Date(item.start_time)
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const daysDiff = Math.round((dayStart.getTime() - startOfToday.getTime()) / 86400000)

    if (direction === 'upcoming') {
      if (daysDiff === 0) {
        ensureGroup('today', 'Today', item)
      } else if (daysDiff === 1) {
        ensureGroup('tomorrow', 'Tomorrow', item)
      } else if (dayStart >= thisWeekStart && dayStart < nextWeekStart) {
        ensureGroup('thisWeek', 'Later this week', item)
      } else if (dayStart >= nextWeekStart && dayStart < weekAfterNextStart) {
        ensureGroup('nextWeek', 'Next week', item)
      } else {
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: tz })
        ensureGroup(monthKey(date), label, item)
      }
    } else {
      if (daysDiff === -1) {
        ensureGroup('yesterday', 'Yesterday', item)
      } else if (dayStart >= lastWeekStart && dayStart < thisWeekStart) {
        ensureGroup('lastWeek', 'Last week', item)
      } else if (dayStart >= thisWeekStart && dayStart <= startOfToday) {
        ensureGroup('thisWeek', 'Earlier this week', item)
      } else {
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: tz })
        ensureGroup(monthKey(date), label, item)
      }
    }
  }

  // Order: today/tomorrow/thisWeek/nextWeek then ascending months for upcoming.
  // Reverse for past.
  const order = direction === 'upcoming'
    ? ['today', 'tomorrow', 'thisWeek', 'nextWeek']
    : ['yesterday', 'thisWeek', 'lastWeek']

  const monthKeys = Array.from(groups.keys()).filter((k) => k.startsWith('month-'))
  monthKeys.sort()
  if (direction === 'past') monthKeys.reverse()

  const orderedKeys = [...order.filter((k) => groups.has(k)), ...monthKeys]
  return orderedKeys.map((key) => ({
    key,
    label: labels.get(key)!,
    items: groups.get(key)!,
  }))
}
