/**
 * Stripe sales on class sign-up links that arrive without a signup ref: the
 * buyer opened the raw link (Instagram, a text, no account yet). We find the
 * class whose link was paid, record the sale in class_purchases, and enroll
 * the buyer when their email belongs to exactly one dancer. Anything we can't
 * settle stays "paid, not yet linked" for the instructor.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'
import type { WorkshopOption } from '@/lib/class-series'
import { workshopOptions } from '@/lib/class-series'
import { sameLink } from '@/lib/signup-link'
import { centsToDollars } from '@/lib/utils/money'

export interface LinkedClass {
  id: string
  start_time: string
  class_type: string
  series_id: string | null
  workshop_full_only: boolean | null
  external_signup_url: string | null
  workshop_signup_url: string | null
}

export interface LinkMatch {
  classId: string
  option?: WorkshopOption
  // Several classes sell on this link and we can't tell which day was bought
  ambiguous: boolean
}

/**
 * Which class a paid link belongs to. A workshop link sells the full run, so
 * the sale sits on the first day. A day link shared by several days can't say
 * which day was bought: it lands on the earliest, flagged ambiguous.
 */
export function matchPaidLink(classes: LinkedClass[], paidUrl: string): LinkMatch | null {
  const byStart = [...classes].sort((a, b) => a.start_time.localeCompare(b.start_time))

  const fullRun = byStart.filter(cls => sameLink(cls.workshop_signup_url, paidUrl))
  if (fullRun.length > 0) {
    const series = new Set(fullRun.map(cls => cls.series_id))
    return { classId: fullRun[0].id, option: 'full', ambiguous: series.size > 1 }
  }

  const onLink = byStart.filter(cls => sameLink(cls.external_signup_url, paidUrl))
  if (onLink.length === 0) return null
  const first = onLink[0]

  // The class's own link sells the full run when there's no separate workshop link
  const options = workshopOptions(first)
  const sellsFullRun = options.full && (!first.workshop_signup_url || !options.day)
  if (sellsFullRun) {
    const series = new Set(onLink.map(cls => cls.series_id))
    return { classId: first.id, option: 'full', ambiguous: series.size > 1 }
  }

  return { classId: first.id, option: options.full ? 'day' : undefined, ambiguous: onLink.length > 1 }
}

/** The one student with this email, on their profile or their student record. */
export async function findStudentByEmail(db: SupabaseClient, email: string | null | undefined): Promise<string | null> {
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return null

  // Case-insensitive exact match: escape ilike's wildcards, which emails can contain
  const pattern = normalized.replace(/[\\%_]/g, char => `\\${char}`)

  const [{ data: profiles }, { data: byRecord }] = await Promise.all([
    db.from('profiles').select('id').ilike('email', pattern),
    db.from('students').select('id').ilike('email', pattern),
  ])

  const ids = new Set<string>((byRecord || []).map(student => student.id))
  const profileIds = (profiles || []).map(profile => profile.id)
  if (profileIds.length > 0) {
    const { data: byProfile } = await db.from('students').select('id').in('profile_id', profileIds)
    for (const student of byProfile || []) ids.add(student.id)
  }

  return ids.size === 1 ? [...ids][0] : null
}

/** The class_purchases row for a paid checkout. */
export function purchaseRow(
  session: Stripe.Checkout.Session,
  classId: string,
  option: WorkshopOption | undefined,
  studentId: string | null
) {
  const buyer = session.customer_details
  return {
    stripe_checkout_session_id: session.id,
    class_id: classId,
    workshop_option: option ?? null,
    student_id: studentId,
    buyer_name: buyer?.name ?? null,
    buyer_email: buyer?.email?.toLowerCase() ?? null,
    buyer_phone: buyer?.phone ?? null,
    amount_paid: centsToDollars(session.amount_total ?? 0),
    currency: session.currency ?? 'usd',
    purchased_at: new Date(session.created * 1000).toISOString(),
  }
}
