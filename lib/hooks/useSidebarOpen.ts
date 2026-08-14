'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'sidebar-open'
const MOBILE_BREAKPOINT = 768

// Module-level cache so getSnapshot is cheap and returns a stable value.
// useSyncExternalStore re-reads it on every render and will loop forever if
// the value is recomputed into a new reference each time.
let cached: boolean | null = null
const listeners = new Set<() => void>()

function read(): boolean {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    try {
      return Boolean(JSON.parse(saved))
    } catch {
      // Corrupt value — fall through to the breakpoint default.
    }
  }
  return window.innerWidth >= MOBILE_BREAKPOINT
}

function getSnapshot(): boolean {
  if (cached === null) cached = read()
  return cached
}

// The server has no viewport and no localStorage. Rendering closed matches
// the mobile-first default and lets React hydrate without a mismatch.
function getServerSnapshot(): boolean {
  return false
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cached = null
      listeners.forEach(l => l())
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export function setSidebarOpen(open: boolean): void {
  cached = open
  localStorage.setItem(STORAGE_KEY, JSON.stringify(open))
  listeners.forEach(l => l())
}

export function useSidebarOpen(): readonly [boolean, (open: boolean) => void] {
  const isOpen = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setOpen = useCallback((next: boolean) => setSidebarOpen(next), [])
  return [isOpen, setOpen] as const
}

/** Test-only: clears the module cache between cases. */
export function __resetSidebarStore(): void {
  cached = null
  listeners.clear()
}
