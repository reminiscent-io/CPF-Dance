'use client'

import { useEffect, useState } from 'react'
import NewPromo from '../brief/NewPromo'
import { installFakePromoApi, prepareSampleAssets } from './fake-api'

/** Development-only: the brief page against the fake API, at /dev/promo/new. */
export default function BriefHarness() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let uninstall: (() => void) | null = null
    prepareSampleAssets().then((assets) => {
      if (cancelled) return
      uninstall = installFakePromoApi(assets)
      setReady(true)
    })
    return () => {
      cancelled = true
      uninstall?.()
    }
  }, [])

  if (!ready) return <p className="p-6 text-charcoal-700">Preparing sample photos…</p>
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-page-x lg:pt-page-top" data-testid="promo-brief-harness">
      <NewPromo />
    </div>
  )
}
