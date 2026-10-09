import type { LevelKey, SessionInput, SessionValue } from './types'

/**
 * Facts on a promo (dates, times, level, location, price) come from the
 * linked class rows and the brief, formatted here. The model never writes
 * them. Classes are entered and shown in America/New_York
 * (lib/utils/et-timezone.ts), so sessions are formatted in that zone.
 */

export const STUDIO_TIME_ZONE = 'America/New_York'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const LEVEL_OPTIONS: { value: LevelKey; label: string }[] = [
  { value: 'all', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'pre_professional', label: 'Pre-professional' },
  { value: 'custom', label: 'Custom wording' },
]

const LEVEL_PHRASES: Record<Exclude<LevelKey, 'custom'>, string> = {
  all: 'All levels welcome',
  beginner: 'Beginner level',
  intermediate: 'Intermediate level',
  advanced: 'Advanced level',
  pre_professional: 'Pre-professional level',
}

export function levelPhrase(level: LevelKey, custom?: string): string {
  if (level === 'custom') return (custom ?? '').trim()
  return LEVEL_PHRASES[level] ?? LEVEL_PHRASES.all
}

function parseDate(date: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function parseTime(time: string): { h: number; min: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const h = Number(match[1])
  const min = Number(match[2])
  if (h > 23 || min > 59) return null
  return { h, min }
}

function clock(time: { h: number; min: number }): { text: string; period: 'AM' | 'PM' } {
  const period = time.h >= 12 ? 'PM' : 'AM'
  const hour12 = time.h % 12 === 0 ? 12 : time.h % 12
  return { text: `${hour12}:${String(time.min).padStart(2, '0')}`, period }
}

/**
 * "5:00–7:00 PM" when both ends share a period, "11:00 AM – 1:00 PM" when they
 * don't, matching the reference poster. A missing end gives "5:00 PM".
 */
export function formatTimeRange(start: string, end?: string): string {
  const s = parseTime(start)
  if (!s) return ''
  const sc = clock(s)
  const e = end ? parseTime(end) : null
  if (!e) return `${sc.text} ${sc.period}`
  const ec = clock(e)
  if (sc.period === ec.period) return `${sc.text}–${ec.text} ${ec.period}`
  return `${sc.text} ${sc.period} – ${ec.text} ${ec.period}`
}

export function formatSession(session: SessionInput): SessionValue {
  const parsed = parseDate(session.date)
  if (!parsed) return { weekday: '', date: '', time: formatTimeRange(session.start, session.end) }
  // Weekday from the calendar date itself, so the viewer's timezone can't shift it.
  const weekday = WEEKDAYS[new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).getUTCDay()]
  return {
    weekday,
    date: `${MONTHS[parsed.m - 1]} ${parsed.d}`,
    time: formatTimeRange(session.start, session.end),
  }
}

export function sortSessions(sessions: SessionInput[]): SessionInput[] {
  return [...sessions].sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))
}

export function formatSessions(sessions: SessionInput[]): SessionValue[] {
  return sortSessions(sessions)
    .filter((s) => parseDate(s.date))
    .map(formatSession)
}

function localParts(iso: string, timeZone: string): { date: string; time: string } | null {
  const instant = new Date(iso)
  if (Number.isNaN(instant.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

/** Class rows (UTC timestamps) to sessions in studio local time. */
export function sessionsFromClasses(
  classes: { start_time: string; end_time: string }[],
  timeZone: string = STUDIO_TIME_ZONE
): SessionInput[] {
  const sessions: SessionInput[] = []
  for (const cls of classes) {
    const start = localParts(cls.start_time, timeZone)
    const end = localParts(cls.end_time, timeZone)
    if (!start) continue
    sessions.push({ date: start.date, start: start.time, end: end?.time ?? start.time })
  }
  return sortSessions(sessions)
}

export interface ClassForFacts {
  title?: string | null
  location?: string | null
  pricing_model?: string | null
  base_cost?: number | string | null
  cost_per_person?: number | string | null
  cost_per_hour?: number | string | null
  studio?: { name?: string | null; city?: string | null; state?: string | null } | null
}

/** Studio name and city when the class has a studio, else its location text. */
export function locationFromClass(cls: ClassForFacts): string {
  const studio = cls.studio
  if (studio?.name) {
    return [studio.name, studio.city].filter(Boolean).join(', ')
  }
  return (cls.location ?? '').trim()
}

function money(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null
  const amount = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`
}

/** A starting point for the price line; she edits it in the brief. */
export function priceFromClass(cls: ClassForFacts): string {
  switch (cls.pricing_model) {
    case 'per_person':
      return money(cls.cost_per_person) ?? ''
    case 'per_hour': {
      const hourly = money(cls.cost_per_hour)
      return hourly ? `${hourly} per hour` : ''
    }
    case 'per_class':
    case 'tiered':
      return money(cls.base_cost) ?? ''
    default:
      return money(cls.cost_per_person) ?? money(cls.base_cost) ?? ''
  }
}

/** "three" for 3, used to check number words in copy against the facts. */
export const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  single: 1,
  double: 2,
}
