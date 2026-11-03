import { beginNavigation, trackApiRequests } from '@/lib/loading-activity'

// Runs once in the browser before hydration, so the first page's own data
// loads are counted too. See lib/loading-activity.ts.
trackApiRequests()

// Fires synchronously inside Next's navigation transition. The store updates
// through useSyncExternalStore, which React renders at once instead of
// holding the update until the new page is ready.
export function onRouterTransitionStart(url: string) {
  beginNavigation(url)
}
