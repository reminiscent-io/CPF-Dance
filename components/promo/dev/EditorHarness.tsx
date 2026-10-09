'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_BRAND_TOKENS } from '@/lib/promo/brand'
import { primeRendition } from '@/lib/promo/client/images'
import { exampleDocument, placementFor } from '@/lib/promo/document'
import { isPromoFormat } from '@/lib/promo/formats'
import { buildPrecisionWorkshopDefinition } from '@/lib/promo/templates/precision-workshop'
import type { PromoAsset, PromoDesignRow } from '@/lib/promo/types'
import type { EditorData } from '../editor/EditorContext'
import { EditorSession } from '../editor/PromoEditor'
import { createSamplePhotos } from './sample-photos'

const OWNER = '00000000-0000-4000-8000-0000000000aa'

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

/**
 * Development-only: the real editor with stand-in photos and a fake API, so
 * the editing, autosave and export paths run without Supabase. Lives at
 * /dev/promo/editor?format=ig_post|ig_story|poster.
 */
export default function EditorHarness() {
  const [data, setData] = useState<EditorData | null>(null)

  useEffect(() => {
    let revision = 1
    const realFetch = window.fetch.bind(window)
    const samples = createSamplePhotos()
    const assets: PromoAsset[] = samples.map((photo, index) => ({
      id: photo.id,
      owner_id: OWNER,
      parent_id: null,
      status: 'ready',
      original_path: `${OWNER}/assets/${photo.id}/original.jpg`,
      display_path: `${OWNER}/assets/${photo.id}/display.jpg`,
      thumb_path: `${OWNER}/assets/${photo.id}/thumb.jpg`,
      width: photo.width,
      height: photo.height,
      bytes: 1_500_000,
      original_filename: `${photo.label}.jpg`,
      tags: {
        orientation: photo.width > photo.height ? 'landscape' : 'portrait',
        description: photo.label,
        shotTypes: index === 0 ? ['full_body'] : [],
      },
      pose: index === 0 ? { source: 'pose', subject: { x: 0.3, y: 0.05, w: 0.4, h: 0.9 } } : null,
      tags_edited: false,
      tagged_at: new Date().toISOString(),
      favorite: index < 2,
      created_at: new Date().toISOString(),
    }))

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
      const method = (init?.method ?? 'GET').toUpperCase()
      if (!url.startsWith('/api/promo/')) return realFetch(input, init)
      if (url === '/api/promo/me') return json(200, { ownerId: OWNER, isAdmin: true, name: 'Dev' })
      if (url === '/api/promo/assets' && method === 'GET') return json(200, { assets })
      if (/\/api\/promo\/designs\/[^/]+$/.test(url) && method === 'PATCH') {
        revision += 1
        return json(200, { revision, updated_at: new Date().toISOString() })
      }
      if (url.endsWith('/revisions') || url.endsWith('/thumbnail')) return json(201, {})
      return json(404, { error: 'Not in the dev harness' })
    }

    let cancelled = false
    Promise.all(
      samples.map(
        (photo) =>
          new Promise<void>((resolve) =>
            photo.canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob)
                for (const rendition of ['thumb', 'display', 'original'] as const) primeRendition(photo.id, rendition, url)
              }
              resolve()
            }, 'image/jpeg', 0.9)
          )
      )
    ).then(() => {
      if (cancelled) return
      const params = new URLSearchParams(window.location.search)
      const requested = params.get('format')
      const format = isPromoFormat(requested) ? requested : 'ig_post'
      const definition = buildPrecisionWorkshopDefinition()
      const base = exampleDocument(definition)
      const [hero, ...rest] = assets
      const design: PromoDesignRow = {
        id: 'dev-design',
        owner_id: OWNER,
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
        revision,
        thumbnail_updated_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setData({
        design,
        template: { versionId: 'dev-version', version: 1, definition },
        assets,
        siblings: [{ id: 'dev-design', format, title: design.title, updated_at: design.updated_at }],
        publication: null,
        classes: [],
      })
    })

    return () => {
      cancelled = true
      window.fetch = realFetch
    }
  }, [])

  if (!data) return <p className="p-6 text-charcoal-700">Preparing sample photos…</p>
  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-5 sm:px-6 lg:px-page-x lg:pt-page-top" data-testid="promo-editor-harness">
      <EditorSession data={data} onReload={() => window.location.reload()} />
    </div>
  )
}
