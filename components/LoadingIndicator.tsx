'use client'

import { Suspense, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { InlineSpinner } from '@/components/ui/Spinner'
import { endNavigation, useLoadingActivity } from '@/lib/loading-activity'

/** How long a page change runs before the notice says so in words. */
export const SLOW_NAVIGATION_MS = 8000

/**
 * App-wide answer to "is anything happening?" on a bad connection:
 * - a thin Stage Rose bar under the status bar while a page or `/api`
 *   request is in flight (styles: `.loading-bar` in globals.css);
 * - "Still loading…" once a page change passes SLOW_NAVIGATION_MS;
 * - "You're offline" whenever the device reports no connection.
 *
 * Mounted once in the root layout. The data comes from
 * lib/loading-activity.ts.
 */
export function LoadingIndicator() {
  const { pendingPathname, navigationStartedAt, requests } = useLoadingActivity()
  const active = pendingPathname !== null || requests > 0
  const slow = useHasElapsed(navigationStartedAt, SLOW_NAVIGATION_MS)
  const online = useOnline()

  return (
    <>
      <div className="loading-bar" data-active={active ? '' : undefined} aria-hidden="true">
        <span className="loading-bar__ribbon" />
      </div>

      <Suspense fallback={null}>
        <NavigationEndListener />
      </Suspense>

      {/* The live region stays mounted so screen readers hear each notice. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3rem)] z-[110] flex justify-center px-4 md:top-5"
      >
        {!online ? (
          <Notice icon={<span className="h-2 w-2 shrink-0 rounded-full bg-rose-600" />}>
            You&apos;re offline. Check your signal and try again.
          </Notice>
        ) : slow ? (
          <Notice icon={<InlineSpinner className="text-rose-600" />}>Still loading…</Notice>
        ) : null}
      </div>
    </>
  )
}

function Notice({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p
      className="animate-fadeIn inline-flex items-center gap-2.5 rounded-full border border-champagne-200 bg-champagne-50 px-4 py-2 text-sm text-charcoal-800 shadow-soft"
      style={{ fontWeight: 500, letterSpacing: '0.01em' }}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
      {children}
    </p>
  )
}

/**
 * A navigation is over once its URL renders. useSearchParams needs its own
 * Suspense boundary in the root layout, so this lives apart from the bar.
 */
function NavigationEndListener() {
  const pathname = usePathname()
  const search = useSearchParams().toString()

  useEffect(() => {
    endNavigation()
  }, [pathname, search])

  return null
}

/** True once `ms` have passed since `since`, for as long as `since` holds. */
function useHasElapsed(since: number | null, ms: number): boolean {
  const [reached, setReached] = useState<number | null>(null)

  useEffect(() => {
    if (since === null) return
    const id = setTimeout(() => setReached(since), Math.max(0, since + ms - Date.now()))
    return () => clearTimeout(id)
  }, [since, ms])

  return since !== null && reached === since
}

function subscribeToConnection(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true
  )
}
