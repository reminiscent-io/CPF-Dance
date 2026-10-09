import { NUMBER_WORDS } from '../facts'
import type { SlotDef } from '../types'

/**
 * Checks on AI copy before it reaches a design. Facts (dates, times, prices,
 * level) are written by code, so copy that states one is rejected rather
 * than trusted: a pill reading "Nov 14 only" could quietly contradict the
 * schedule. Errors read as instructions, because they go back to the model
 * for its one retry.
 */

const MONTHS =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\b|\b(JANUARY|FEBRUARY|MARCH|APRIL|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)\b/
const WEEKDAYS =
  /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues?|Wed|Thu|Thurs?|Fri|Sat|Sun)\b|\b(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/
const CLOCK = /\b(noon|midnight|o'clock|a\.m\.|p\.m\.)/i
const CURRENCY = /[$€£¥]|\b(dollars?|usd|bucks)\b/i
const DIGITS = /\d/
const COUNTED = new RegExp(
  `\\b(${Object.keys(NUMBER_WORDS).join('|')})[\\s-]+(days?|sessions?|classes|class|evenings?|mornings?|nights?|weekends?|weeks?)\\b`,
  'gi'
)

export interface CopyContext {
  bannedWords: string[]
  /** Number of dates on the promo, for "three days" style claims. */
  sessionCount: number
}

/** Problems with one piece of copy, phrased for the model. */
export function copyProblems(label: string, text: string, context: CopyContext): string[] {
  const problems: string[] = []
  if (text.includes('!')) problems.push(`${label}: remove the exclamation point.`)
  if (DIGITS.test(text)) problems.push(`${label}: no digits. Dates, times and prices are added separately.`)
  if (MONTHS.test(text) || WEEKDAYS.test(text)) {
    problems.push(`${label}: don’t name months or weekdays. The dates are shown separately.`)
  }
  if (CLOCK.test(text)) problems.push(`${label}: don’t mention times of day.`)
  if (CURRENCY.test(text)) problems.push(`${label}: don’t mention price.`)
  for (const match of text.matchAll(COUNTED)) {
    const count = NUMBER_WORDS[match[1].toLowerCase()]
    const unit = match[2].toLowerCase()
    const countsDates = /^(days?|sessions?|class(es)?|evenings?|mornings?|nights?)$/.test(unit)
    if (countsDates && count !== context.sessionCount) {
      problems.push(
        `${label}: "${match[0]}" doesn’t match the schedule, which has ${context.sessionCount} ${
          context.sessionCount === 1 ? 'date' : 'dates'
        }. Leave the count out.`
      )
    }
  }
  const lower = text.toLowerCase()
  for (const word of context.bannedWords) {
    const pattern = new RegExp(`\\b${word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    if (pattern.test(lower)) problems.push(`${label}: don’t use the word "${word}".`)
  }
  return problems
}

/** Length and count rules from the slot definition. */
export function slotProblems(slot: SlotDef, value: string | string[], context: CopyContext): string[] {
  const problems: string[] = []
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text && slot.required) problems.push(`${slot.label}: write something; it can’t be empty.`)
    if (slot.maxChars && text.length > slot.maxChars) {
      problems.push(`${slot.label}: ${text.length} characters; keep it to ${slot.maxChars} or fewer.`)
    }
    problems.push(...copyProblems(slot.label, text, context))
    return problems
  }
  const items = value.map((item) => item.trim()).filter(Boolean)
  const min = slot.list?.min ?? 0
  const max = slot.list?.max ?? 20
  if (items.length < min || items.length > max) {
    problems.push(`${slot.label}: give ${min === max ? max : `${min} to ${max}`} items, not ${items.length}.`)
  }
  items.forEach((item, index) => {
    const name = `${slot.label} item ${index + 1}`
    if (slot.maxChars && item.length > slot.maxChars) {
      problems.push(`${name}: ${item.length} characters; keep each to ${slot.maxChars} or fewer.`)
    }
    problems.push(...copyProblems(name, item, context))
  })
  const seen = new Set<string>()
  for (const item of items) {
    const key = item.toLowerCase()
    if (seen.has(key)) problems.push(`${slot.label}: "${item}" appears twice.`)
    seen.add(key)
  }
  return problems
}

/** Photo choices must come from her selection, without repeats. */
export function photoProblems(
  label: string,
  ids: string[],
  allowed: string[],
  options: { max: number; exclude?: string[] }
): string[] {
  const problems: string[] = []
  const allowedSet = new Set(allowed)
  const seen = new Set(options.exclude ?? [])
  for (const id of ids) {
    if (!allowedSet.has(id)) problems.push(`${label}: "${id}" isn’t one of the selected photos.`)
    else if (seen.has(id)) problems.push(`${label}: use each photo once.`)
    seen.add(id)
  }
  if (ids.length > options.max) problems.push(`${label}: at most ${options.max} photos.`)
  return problems
}
