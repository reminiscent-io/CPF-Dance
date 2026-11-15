/**
 * Dancer feedback on a class, workshop or private lesson (migration 54).
 *
 * Two ways in, one form (components/feedback/FeedbackForm.tsx):
 *   /feedback/<token>          the no-login link the instructor texts out
 *   /dancer/feedback/<class>   from the dancer portal, one response per dancer
 *
 * A workshop collects feedback once for the whole run, keyed by its first day,
 * the same way its share slug is (lib/class-share-slug.ts).
 *
 * Client-safe: no Supabase here. Server lookups live in class-feedback-server.ts.
 */

import { ET_TIMEZONE } from '@/lib/utils/et-timezone'

export const FEEDBACK_TEXT_FIELDS = ['do_again', 'more_of', 'less_of', 'outcomes', 'comments'] as const
export type FeedbackTextField = (typeof FEEDBACK_TEXT_FIELDS)[number]

export const MAX_FEEDBACK_TEXT = 4000
export const MAX_FEEDBACK_NAME = 100

export type FeedbackValues = { name: string | null; rating: number | null } & Record<FeedbackTextField, string | null>

/** The class as the form names it: title, dates and who taught it */
export interface FeedbackHeading {
  title: string
  classType: string
  /** "November 14 & 15, 2026" */
  dates: string
  instructorName: string | null
}

export interface FeedbackPrompt {
  field: FeedbackTextField
  prompt: string
}

/** "workshop", "lesson" or "class", for the prompts' wording */
export function feedbackNoun(classType: string): string {
  if (classType === 'workshop') return 'workshop'
  if (classType === 'private') return 'lesson'
  return 'class'
}

/** The questions, in order, worded for the kind of class and its instructor */
export function feedbackPrompts(classType: string, instructorName: string | null): FeedbackPrompt[] {
  const noun = feedbackNoun(classType)
  const firstName = instructorName?.trim().split(/\s+/)[0] || 'your instructor'
  return [
    { field: 'do_again', prompt: `What parts would you want to do again in another ${noun}?` },
    { field: 'more_of', prompt: 'What would you do more of? What did you really like?' },
    { field: 'less_of', prompt: 'What would you do less of, or focus on less, next time?' },
    {
      field: 'outcomes',
      prompt: 'What outcomes did you see? Better technique, stronger fundamentals, more enjoyment, understanding precision technique, anything.',
    },
    { field: 'comments', prompt: `Anything else for ${firstName} to make the next session even better?` },
  ]
}

/** Short names for the answers, for the instructor's list */
export const FEEDBACK_SHORT_LABELS: Record<FeedbackTextField, string> = {
  do_again: 'Do again',
  more_of: 'More of',
  less_of: 'Less of',
  outcomes: 'Outcomes',
  comments: 'Comments',
}

/** The word that sits under the stars once a rating is picked */
export const RATING_WORDS: Record<number, string> = {
  1: 'Not for me',
  2: 'It was okay',
  3: 'Good',
  4: 'Really good',
  5: 'Yay!',
}

export type ParsedFeedback = { ok: true; values: FeedbackValues } | { ok: false; error: string }

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

/**
 * Validates a submitted form. Every field is optional, but a response with no
 * stars and no words says nothing, so that one is refused.
 */
export function parseFeedback(body: unknown): ParsedFeedback {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid request' }
  const input = body as Record<string, unknown>

  let rating: number | null = null
  if (input.rating !== null && input.rating !== undefined && input.rating !== '') {
    const n = Number(input.rating)
    if (!Number.isInteger(n) || n < 1 || n > 5) return { ok: false, error: 'Rating must be 1 to 5 stars' }
    rating = n
  }

  const values = { name: cleanText(input.name, MAX_FEEDBACK_NAME), rating } as FeedbackValues
  for (const field of FEEDBACK_TEXT_FIELDS) {
    values[field] = cleanText(input[field], MAX_FEEDBACK_TEXT)
  }

  if (rating === null && FEEDBACK_TEXT_FIELDS.every(field => values[field] === null)) {
    return { ok: false, error: 'Add a star rating or a few words first' }
  }
  return { ok: true, values }
}

function etParts(iso: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return { month: part('month'), day: part('day'), year: part('year') }
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`
}

/**
 * The class's dates on the Eastern calendar, compact:
 *   one day           "November 14, 2026"
 *   one month         "November 14 & 15, 2026"
 *   across months     "October 31 & November 1, 2026"
 *   across years      "December 31, 2026 & January 1, 2027"
 */
export function formatFeedbackDates(startTimes: string[]): string {
  const seen = new Set<string>()
  const days = [...startTimes]
    .sort()
    .map(etParts)
    .filter(d => {
      const key = `${d.year}-${d.month}-${d.day}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  if (days.length === 0) return ''

  const years = new Set(days.map(d => d.year))
  if (years.size > 1) return joinList(days.map(d => `${d.month} ${d.day}, ${d.year}`))

  const year = days[0].year
  const months = new Set(days.map(d => d.month))
  if (months.size === 1) return `${days[0].month} ${joinList(days.map(d => d.day))}, ${year}`
  return `${joinList(days.map(d => `${d.month} ${d.day}`))}, ${year}`
}

// No 0/o, 1/l/i: the link gets read aloud and retyped from texts
const TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const TOKEN_LENGTH = 10

/** A random link key: 10 characters from 31, about 49 bits */
export function generateFeedbackToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH)
  crypto.getRandomValues(bytes)
  let token = ''
  for (const byte of bytes) token += TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]
  return token
}

const TOKEN_PATTERN = new RegExp(`^[${TOKEN_ALPHABET}]{${TOKEN_LENGTH}}$`)

/** True when `value` could be a feedback token; anything else is not looked up */
export function isFeedbackToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}
