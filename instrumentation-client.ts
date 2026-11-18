import { initPostHog, syncReplayForPath } from '@/lib/analytics/posthog-client'
import { beginNavigation, trackApiRequests } from '@/lib/loading-activity'

// Off until the consent banner opts the visitor in. See lib/analytics/posthog-client.ts.
initPostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN)

// Runs once in the browser before hydration, so the first page's own data
// loads are counted too. See lib/loading-activity.ts.
trackApiRequests()

// Fires synchronously inside Next's navigation transition. The store updates
// through useSyncExternalStore, which React renders at once instead of
// holding the update until the new page is ready.
export function onRouterTransitionStart(url: string) {
  beginNavigation(url)
  syncReplayForPath(url)
}
