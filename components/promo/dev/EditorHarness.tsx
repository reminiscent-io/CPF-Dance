'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_BRAND_TOKENS } from '@/lib/promo/brand'
import { exampleDocument, placementFor } from '@/lib/promo/document'
import { isPromoFormat } from '@/lib/promo/formats'
import { buildPrecisionWorkshopDefinition } from '@/lib/promo/templates/precision-workshop'
import type { PromoDesignRow } from '@/lib/promo/types'
import type { EditorData } from '../editor/EditorContext'
import { EditorSession } from '../editor/PromoEditor'
import { DEV_OWNER, installFakePromoApi, prepareSampleAssets } from './fake-api'

/**
 * Development-only: the real editor with stand-in photos and a fake API, so
 * the editing, autosave, AI revision and export paths run without Supabase
 * or OpenAI. Lives at /dev/promo/editor?format=ig_post|ig_story|poster.
 */
export default function EditorHarness() {
  const [data, setData] = useState<EditorData | null>(null)

  useEffect(() => {
    let cancelled = false
    let uninstall: (() => void) | null = null
    prepareSampleAssets().then((assets) => {
      if (cancelled) return
      uninstall = installFakePromoApi(assets)
      const requested = new URLSearchParams(window.location.search).get('format')
      const format = isPromoFormat(requested) ? requested : 'ig_post'
      const definition = buildPrecisionWorkshopDefinition()
      const base = exampleDocument(definition)
      const [hero, ...rest] = assets
      const now = new Date().toISOString()
      const design: PromoDesignRow = {
        id: 'dev-design',
        owner_id: DEV_OWNER,
        title: 'Precision Workshop',
        template_version_id: 'dev-version',
        format,
        group_id: 'dev-group',
        class_ids: [],
        brief: {},
        document: {
          ...base,
          photos: { hero: [placementFor(hero)], strip: rest.slice(0, 4).map((asset) => placementFor(asset)) },
        },
        brand_snapshot: DEFAULT_BRAND_TOKENS,
        revision: 1,
        thumbnail_updated_at: null,
        created_at: now,
        updated_at: now,
      }
      setData({
        design,
        template: { versionId: 'dev-version', version: 1, definition },
        assets,
        siblings: [{ id: 'dev-design', format, title: design.title, updated_at: now }],
        publication: null,
        classes: [],
      })
    })
    return () => {
      cancelled = true
      uninstall?.()
    }
  }, [])

  if (!data) return <p className="p-6 text-charcoal-700">Preparing sample photos…</p>
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-page-x lg:pt-page-top" data-testid="promo-editor-harness">
      <EditorSession data={data} onReload={() => window.location.reload()} />
    </div>
  )
}
