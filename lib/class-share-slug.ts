/**
 * Readable slugs for shared class links: /classes/precision-workshop-oct-18-2026.
 *
 * A slug is minted once, the first time the instructor asks for the link, and
 * stored on the class (classes.share_slug, migration 51). It never changes
 * after that, so a link already sent out keeps working when the title or date
 * is edited. A workshop's slug lives on its first day and covers the whole run.
 *
 * Two classes can share a title and a date. The first to ask keeps the plain
 * slug; later ones get -2, -3, ... The unique index on share_slug is what
 * actually decides, so two requests racing for one slug can't both win.
 */

import { ET_TIMEZONE } from '@/lib/utils/et-timezone'

const MAX_TITLE_LENGTH = 60
const MAX_ATTEMPTS = 20

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True for a class id. Links made before slugs used the id. */
export function isClassId(value: string): boolean {
  return UUID_PATTERN.test(value)
}

/** "Pointe & Partnering: Level II" -> "pointe-partnering-level-ii" */
export function slugifyTitle(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (slug.length <= MAX_TITLE_LENGTH) return slug || 'class'
  // Cut at a word boundary so the slug doesn't end mid-word
  const cut = slug.slice(0, MAX_TITLE_LENGTH + 1)
  const lastDash = cut.lastIndexOf('-')
  return lastDash > 0 ? cut.slice(0, lastDash) : slug.slice(0, MAX_TITLE_LENGTH)
}

/** "2026-10-18T22:00:00Z" -> "oct-18-2026", on the Eastern calendar day */
export function slugifyDate(startTime: string | Date): string {
  const date = typeof startTime === 'string' ? new Date(startTime) : startTime
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).formatToParts(date)
  const part = (type: string) => parts.find(p => p.type === type)?.value ?? ''
  return `${part('month')}-${part('day')}-${part('year')}`.toLowerCase()
}

export function buildShareSlug(title: string, startTime: string | Date): string {
  return `${slugifyTitle(title)}-${slugifyDate(startTime)}`
}

/**
 * Claims the first free slug of `base`, `base-2`, `base-3`, ... `tryClaim`
 * writes the candidate and reports 'taken' when the unique index refuses it.
 */
export async function claimShareSlug(
  base: string,
  tryClaim: (slug: string) => Promise<'claimed' | 'taken'>
): Promise<string> {
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    if ((await tryClaim(slug)) === 'claimed') return slug
  }
  throw new Error(`No free share slug for "${base}" after ${MAX_ATTEMPTS} tries`)
}
