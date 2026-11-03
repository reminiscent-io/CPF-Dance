/**
 * What the app is waiting on, so the screen can say so. On a slow connection
 * a tap that changes nothing reads as a broken site. This store feeds the top
 * progress bar, the "Still loading" notice and the nav's instant highlight
 * (components/LoadingIndicator.tsx, Sidebar, bottom navs).
 *
 * Two sources, both wired in instrumentation-client.ts:
 * - Page navigations, from Next's `onRouterTransitionStart` hook. It fires
 *   for <Link>, router.push/replace and back/forward alike, so no call site
 *   has to opt in. A navigation ends when the rendered URL changes.
 * - Same-origin `/api/*` fetches, counted by a fetch wrapper. That covers
 *   every save and every client-side data load without touching them.
 */
import { useSyncExternalStore } from 'react'

export interface LoadingActivity {
  /** Pathname of the page being loaded, or null when no navigation is pending. */
  pendingPathname: string | null
  /** Date.now() when that navigation began. */
  navigationStartedAt: number | null
  /** `/api/*` requests still waiting on a response. */
  requests: number
}

const IDLE: LoadingActivity = { pendingPathname: null, navigationStartedAt: null, requests: 0 }

/**
 * A navigation whose URL never changes (the proxy redirecting back to the
 * current page, say) would otherwise hold the bar up forever. This is longer
 * than a real page load on a bad connection.
 */
export const NAVIGATION_TIMEOUT_MS = 45_000

let state = IDLE
const listeners = new Set<() => void>()
let navigationTimer: ReturnType<typeof setTimeout> | null = null
let fetchTracked = false

function update(next: Partial<LoadingActivity>) {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getLoadingActivity(): LoadingActivity {
  return state
}

/** Called from `onRouterTransitionStart` with the URL being navigated to. */
export function beginNavigation(href: string): void {
  if (typeof window === 'undefined') return

  let target: URL
  try {
    target = new URL(href, window.location.href)
  } catch {
    return
  }

  // A hash-only link scrolls in place, and back/forward arrives with the
  // address bar already updated. Neither has a page to wait for.
  const here = window.location.pathname + window.location.search
  if (target.origin !== window.location.origin || target.pathname + target.search === here) {
    return
  }

  if (navigationTimer) clearTimeout(navigationTimer)
  navigationTimer = setTimeout(endNavigation, NAVIGATION_TIMEOUT_MS)
  update({ pendingPathname: target.pathname, navigationStartedAt: Date.now() })
}

/** Called once the new URL has rendered. */
export function endNavigation(): void {
  if (navigationTimer) {
    clearTimeout(navigationTimer)
    navigationTimer = null
  }
  if (state.pendingPathname !== null) {
    update({ pendingPathname: null, navigationStartedAt: null })
  }
}

function isApiRequest(input: RequestInfo | URL): boolean {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  try {
    const url = new URL(raw, window.location.href)
    return url.origin === window.location.origin && url.pathname.startsWith('/api/')
  } catch {
    return false
  }
}

/**
 * Wraps `window.fetch` so in-flight `/api/*` requests show on the progress
 * bar. Other origins (Supabase, Stripe, Google) and Next's own page fetches
 * pass straight through. Idempotent.
 */
export function trackApiRequests(): void {
  if (typeof window === 'undefined' || fetchTracked) return
  fetchTracked = true

  const nativeFetch = window.fetch
  window.fetch = (input, init) => {
    if (!isApiRequest(input)) return nativeFetch(input, init)

    update({ requests: state.requests + 1 })
    return nativeFetch(input, init).finally(() => {
      update({ requests: state.requests - 1 })
    })
  }
}

export function useLoadingActivity(): LoadingActivity {
  return useSyncExternalStore(subscribe, getLoadingActivity, () => IDLE)
}

/**
 * The pathname a nav item should light up for: the page being loaded, so a
 * tap registers at once, else null. Only re-renders when that path changes.
 */
export function usePendingPathname(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => state.pendingPathname,
    () => null
  )
}
