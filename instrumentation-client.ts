import posthog from 'posthog-js'
import { beginNavigation, trackApiRequests } from '@/lib/loading-activity'

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST

if (token && host) {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-08-30',
    capture_exceptions: true,
    debug: process.env.NODE_ENV === 'development',
  })
} else if (process.env.NODE_ENV === 'development') {
  const missingVariable = token
    ? 'NEXT_PUBLIC_POSTHOG_HOST'
    : 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN'

  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
  )
}

// Runs once in the browser before hydration, so the first page's own data
// loads are counted too. See lib/loading-activity.ts.
trackApiRequests()

// Fires synchronously inside Next's navigation transition. The store updates
// through useSyncExternalStore, which React renders at once instead of
// holding the update until the new page is ready.
export function onRouterTransitionStart(url: string) {
  beginNavigation(url)
}
