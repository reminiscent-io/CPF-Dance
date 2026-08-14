'use client'

import { useSyncExternalStore } from 'react'

// Nothing to subscribe to — the value flips once, when React hydrates, and
// never changes again.
const noopSubscribe = () => () => {}

/**
 * False during server rendering and the hydration pass, true afterwards.
 *
 * Use this to gate anything that must not differ between the server HTML and
 * the first client render — framer-motion enter animations being the case in
 * this codebase. Doing the same job with `useState(false)` plus an effect
 * works, but writes state from an effect purely to learn something React
 * already knows.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
}
