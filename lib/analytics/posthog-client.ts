import posthog from 'posthog-js'
import type { UserRole } from '@/lib/auth/types'

// Browser analytics. Three rules hold everywhere in this file:
//
// 1. Nothing is captured or stored until CookieConsentBanner grants consent
//    (US visitors get it automatically, GDPR visitors by clicking).
// 2. PostHog knows a person by Supabase user ID and role only. Many dancers are
//    minors, so names and emails stay out.
// 3. Session replay is for dancers and visitors. Instructor and admin screens
//    show every student's data, so they are never recorded. Note, waiver and
//    email content carries `ph-no-capture`, which blanks it in replay and keeps
//    it out of click events.

/** Same-origin path that next.config.ts rewrites to PostHog, so ad blockers let it through. */
export const POSTHOG_PROXY_PATH = '/ingest'

const STAFF_ROLES: ReadonlySet<UserRole> = new Set(['instructor', 'admin'])
const STAFF_PATH = /^\/(instructor|admin)(\/|$)/

function ready(): boolean {
  return typeof window !== 'undefined' && posthog.__loaded
}

export function isStaffPath(pathname: string): boolean {
  return STAFF_PATH.test(pathname)
}

export function initPostHog(token: string | undefined): void {
  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is not set, so PostHog is off.')
    }
    return
  }

  posthog.init(token, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: 'https://us.posthog.com',
    defaults: '2026-08-30',
    capture_exceptions: true,
    // Rule 1: wait for the consent banner, and keep no cookie until then.
    opt_out_capturing_by_default: true,
    opt_out_persistence_by_default: true,
    // Rule 3: a staff page loaded directly starts unrecorded.
    disable_session_recording: isStaffPath(window.location.pathname),
    session_recording: {
      maskAllInputs: true,
      // TipTap editors hold note, waiver and email drafts.
      blockSelector: '.ProseMirror',
    },
    debug: process.env.NODE_ENV === 'development',
  })
}

/**
 * Called by the consent banner when analytics is allowed. Safe to call on every
 * page load. Opting in also sends the pageview that init held back.
 */
export function grantAnalyticsConsent(): void {
  if (!ready() || posthog.has_opted_in_capturing()) return
  posthog.opt_in_capturing()
}

/** Called by the consent banner when the visitor picks "Necessary only". */
export function revokeAnalyticsConsent(): void {
  if (!ready() || posthog.has_opted_out_capturing()) return
  posthog.opt_out_capturing()
}

/** Called on every client navigation. */
export function syncReplayForPath(url: string): void {
  if (!ready()) return
  const pathname = new URL(url, window.location.origin).pathname
  if (isStaffPath(pathname)) posthog.stopSessionRecording()
}

/** reset() clears consent too, so put it back when the visitor had granted it. */
function resetKeepingConsent(): void {
  const optedIn = posthog.has_opted_in_capturing()
  posthog.reset()
  if (optedIn) posthog.opt_in_capturing({ captureEventName: false })
}

function isIdentified(): boolean {
  return posthog.get_property('$user_state') === 'identified'
}

/**
 * Ties events to the signed-in Supabase user, or forgets them on sign-out.
 * `role` comes from the profiles row, not user metadata, because admins are
 * promoted in the database.
 */
export function syncAnalyticsUser(user: { id: string; role: UserRole } | null): void {
  if (!ready()) return

  if (!user) {
    if (isIdentified()) resetKeepingConsent()
    return
  }

  const alreadyThisUser = isIdentified() && posthog.get_distinct_id() === user.id
  if (!alreadyThisUser) {
    if (isIdentified()) resetKeepingConsent()
    posthog.identify(user.id, { role: user.role })
  }

  // After any reset, which starts a fresh session.
  if (STAFF_ROLES.has(user.role)) posthog.stopSessionRecording()
}
