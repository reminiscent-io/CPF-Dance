'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

// Assume motion is allowed on the server; the client corrects on hydration.
function getServerSnapshot(): boolean {
  return false
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
