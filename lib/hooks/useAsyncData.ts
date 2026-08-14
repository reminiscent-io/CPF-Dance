'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface AsyncDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export interface AsyncDataOptions {
  /** Skip the fetch entirely — e.g. while auth is still resolving. */
  enabled?: boolean
}

/**
 * Fetch-into-local-state, with abort and stale-response handling.
 *
 * This is the one place in the codebase allowed to call setState from an
 * effect. react-hooks/set-state-in-effect exists to catch render loops, where
 * an effect writes state that immediately retriggers itself. A fetch on mount
 * is the opposite: it runs once per dependency change and its result cannot
 * feed back into `deps`. Every call site routes through here so the exception
 * is justified once rather than repeated at each one.
 */
export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
  options: AsyncDataOptions = {}
): AsyncDataResult<T> {
  const { enabled = true } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  // Tracks only the in-flight state of an enabled fetch. `loading` is derived
  // from it below, so a disabled hook reports "not loading" without the effect
  // having to write state to say so.
  const [pending, setPending] = useState(true)

  // Keep the latest fetcher without making it a dependency — callers routinely
  // pass an inline arrow, which would otherwise re-run this on every render.
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  const refetch = useCallback(() => setNonce(n => n + 1), [])

  useEffect(() => {
    if (!enabled) return

    const controller = new AbortController()
    let active = true

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Opening a fetch, not a render loop: the result cannot retrigger these dependencies.
    setPending(true)
    setError(null)

    fetcherRef.current(controller.signal)
      .then(result => {
        if (!active) return
        setData(result)
        setPending(false)
      })
      .catch((err: unknown) => {
        if (!active || controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Something went wrong')
        setPending(false)
      })

    return () => {
      active = false
      controller.abort()
    }
    // `deps` is the caller's dependency list, spread deliberately; `fetcher`
    // is held in a ref so an inline arrow does not retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce])

  return { data, loading: enabled && pending, error, refetch }
}
