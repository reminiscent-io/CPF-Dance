'use client'

import { useEffect, useState } from 'react'

/**
 * A "current time" value that re-renders on a tick. Default 60s — enough to
 * keep "Today" / "Tomorrow" buckets honest across midnight without burning
 * cycles on every minute when nobody's looking.
 */
export function useNow(intervalMs: number = 60_000): Date {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
