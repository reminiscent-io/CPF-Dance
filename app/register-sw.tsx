'use client'

import { useEffect } from 'react'

// The service worker only adds an offline page and static-asset caching, so a
// failed registration costs nothing. Chrome aborts it when the site's storage
// is blocked or corrupt; that is not worth a console error on every load.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch(error => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Service Worker registration failed:', error)
      }
    })
  }, [])

  return null
}
