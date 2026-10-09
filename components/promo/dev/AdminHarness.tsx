'use client'

import { useEffect, useState } from 'react'
import BrandKitForm from '../admin/BrandKitForm'
import TemplateEditor from '../admin/TemplateEditor'
import { installFakePromoApi, prepareSampleAssets } from './fake-api'

/** Development-only: the template editor and brand kit against the fake API, at /dev/promo/admin?page=template|brand. */
export default function AdminHarness() {
  const [page, setPage] = useState<'template' | 'brand' | null>(null)

  useEffect(() => {
    let cancelled = false
    let uninstall: (() => void) | null = null
    prepareSampleAssets().then((assets) => {
      if (cancelled) return
      uninstall = installFakePromoApi(assets)
      setPage(new URLSearchParams(window.location.search).get('page') === 'brand' ? 'brand' : 'template')
    })
    return () => {
      cancelled = true
      uninstall?.()
    }
  }, [])

  if (!page) return <p className="p-6 text-charcoal-700">Preparing…</p>
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-page-x lg:pt-page-top" data-testid="promo-admin-harness">
      {page === 'brand' ? <BrandKitForm /> : <TemplateEditor templateId="t1" />}
    </div>
  )
}
