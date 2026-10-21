/**
 * External sign-up links for public classes. When the link is a Stripe
 * Payment Link, we tag it with `client_reference_id` naming the class, the
 * dancer and the option. Stripe echoes that back on checkout.session.completed,
 * and the webhook enrolls the dancer without them having to confirm by hand.
 *
 * Safe on the client: nothing here reads a secret.
 */
import type { WorkshopOption } from '@/lib/class-series'

// Stripe serves Payment Links from more than one host; book. is the newer one
const STRIPE_PAYMENT_LINK_HOSTS = ['buy.stripe.com', 'book.stripe.com', 'donate.stripe.com']
const PREFIX = 'cpfclass'
const UUID = '[0-9a-fA-F-]{36}'
// Stripe allows up to 200 alphanumerics, dashes and underscores
const REF_PATTERN = new RegExp(`^${PREFIX}_(${UUID})_(${UUID})_(full|day|auto)$`)

export interface SignupRef {
  classId: string
  studentId: string
  option?: WorkshopOption
}

/** The link a sign-up button opens. Multi-day workshops sell the full run on their own link. */
export function signupUrlFor(
  cls: { external_signup_url: string | null; workshop_signup_url?: string | null },
  option?: WorkshopOption
): string | null {
  return option === 'full'
    ? cls.workshop_signup_url || cls.external_signup_url
    : cls.external_signup_url
}

export function isStripePaymentLink(url: string): boolean {
  try {
    return STRIPE_PAYMENT_LINK_HOSTS.includes(new URL(url).hostname)
  } catch {
    return false
  }
}

export function buildSignupRef({ classId, studentId, option }: SignupRef): string {
  return `${PREFIX}_${classId}_${studentId}_${option ?? 'auto'}`
}

export function parseSignupRef(ref: string | null | undefined): SignupRef | null {
  const match = ref ? REF_PATTERN.exec(ref) : null
  if (!match) return null
  const [, classId, studentId, option] = match
  return { classId, studentId, option: option === 'auto' ? undefined : option as WorkshopOption }
}

/** Tag a Stripe Payment Link so its sale can be matched to the dancer. Other links pass through. */
export function withSignupRef(url: string, ref: SignupRef | null): string {
  if (!ref || !isStripePaymentLink(url)) return url
  const tagged = new URL(url)
  tagged.searchParams.set('client_reference_id', buildSignupRef(ref))
  return tagged.toString()
}

/**
 * Compare links by origin and path, so a pasted query string or trailing slash
 * still matches. Stripe's link hosts count as one origin: the path names the link.
 */
export function sameLink(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  try {
    const origin = (u: URL) => STRIPE_PAYMENT_LINK_HOSTS.includes(u.hostname) ? 'stripe-payment-link' : u.origin
    const strip = (u: URL) => `${origin(u)}${u.pathname.replace(/\/+$/, '')}`
    return strip(new URL(a)) === strip(new URL(b))
  } catch {
    return false
  }
}
