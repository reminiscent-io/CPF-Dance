'use client'

import { applyRevision } from '@/lib/promo/ai/revise'
import { documentFromVariation, type Variation } from '@/lib/promo/ai/generate'
import { DEFAULT_BRAND_TOKENS } from '@/lib/promo/brand'
import { primeRendition } from '@/lib/promo/client/images'
import { factValues } from '@/lib/promo/document'
import { buildPrecisionWorkshopDefinition } from '@/lib/promo/templates/precision-workshop'
import type { DesignDocument, PromoAsset, PromoBrief } from '@/lib/promo/types'
import { createSamplePhotos } from './sample-photos'

/**
 * Development-only stand-ins for the Promo Studio API, so the editor and the
 * brief page run without Supabase or OpenAI. Nothing here ships: the dev
 * routes that use it refuse to render outside `next dev`.
 */

export const DEV_OWNER = '00000000-0000-4000-8000-0000000000aa'

/** Canvas sample photos as library rows, with their renditions served from blob URLs. */
export async function prepareSampleAssets(): Promise<PromoAsset[]> {
  const samples = createSamplePhotos()
  await Promise.all(
    samples.map(
      (photo) =>
        new Promise<void>((resolve) =>
          photo.canvas.toBlob(
            (blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob)
                for (const rendition of ['thumb', 'display', 'original'] as const) primeRendition(photo.id, rendition, url)
              }
              resolve()
            },
            'image/jpeg',
            0.9
          )
        )
    )
  )
  return samples.map((photo, index) => ({
    id: photo.id,
    owner_id: DEV_OWNER,
    parent_id: null,
    status: 'ready' as const,
    original_path: `${DEV_OWNER}/assets/${photo.id}/original.jpg`,
    display_path: `${DEV_OWNER}/assets/${photo.id}/display.jpg`,
    thumb_path: `${DEV_OWNER}/assets/${photo.id}/thumb.jpg`,
    width: photo.width,
    height: photo.height,
    bytes: 1_500_000,
    original_filename: `${photo.label}.jpg`,
    tags: {
      orientation: photo.width > photo.height ? ('landscape' as const) : ('portrait' as const),
      description: photo.label,
      shotTypes: index === 0 ? (['full_body'] as const).slice() : [],
    },
    pose: index === 0 ? { source: 'pose' as const, subject: { x: 0.3, y: 0.05, w: 0.4, h: 0.9 } } : null,
    tags_edited: false,
    tagged_at: new Date().toISOString(),
    favorite: index < 2,
    created_at: new Date().toISOString(),
  }))
}

function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

const ANGLE_COPY: { angle: string; label: string; variation: Omit<Variation, 'photos'> }[] = [
  {
    angle: 'technique',
    label: 'Technique first',
    variation: {
      copy: {
        title_primary: 'Precision',
        title_accent: 'Workshop',
        tagline: 'Every count, on purpose.',
        keywords: ['Technique', 'Placement', 'Control', 'Kicks', 'Turns', 'Lines'],
        description: 'Detail work for dancers who want clean, exact technique that holds up under pressure.',
        pills: ['Kick technique', 'Turn mechanics', 'Clean transitions', 'Performance polish'],
      },
      variant: 'ivory',
    },
  },
  {
    angle: 'performance',
    label: 'Performance first',
    variation: {
      copy: {
        title_primary: 'Stage',
        title_accent: 'Intensive',
        tagline: 'Dance it full out.',
        keywords: ['Presence', 'Musicality', 'Focus', 'Styling'],
        description: 'Bring the energy of the stage into every combination, with notes on presence and musicality.',
        pills: ['Stage presence', 'Musicality', 'Styling and attack'],
      },
      variant: 'noir',
    },
  },
  {
    angle: 'strength',
    label: 'Strength first',
    variation: {
      copy: {
        title_primary: 'Power',
        title_accent: 'Clinic',
        tagline: 'Kicks that last.',
        keywords: ['Strength', 'Stamina', 'Flexibility', 'Kicks', 'Core'],
        description: 'Conditioning built for kick lines: strength, stamina and flexibility trained safely.',
        pills: ['Strength and stamina', 'Flexibility', 'Kick endurance', 'Core control'],
      },
      variant: 'ivory',
    },
  },
]

const SAMPLE_CLASSES = [
  { id: 'c1', title: 'Precision Workshop, day one', class_type: 'workshop', start_time: '2026-11-13T22:00:00Z', end_time: '2026-11-14T00:00:00Z', location: 'Broadway Dance Center', pricing_model: 'per_person', cost_per_person: 120 },
  { id: 'c2', title: 'Precision Workshop, day two', class_type: 'workshop', start_time: '2026-11-14T16:00:00Z', end_time: '2026-11-14T18:00:00Z', location: 'Broadway Dance Center', pricing_model: 'per_person', cost_per_person: 120 },
  { id: 'c3', title: 'Precision Workshop, day three', class_type: 'workshop', start_time: '2026-11-15T16:00:00Z', end_time: '2026-11-15T18:00:00Z', location: 'Broadway Dance Center', pricing_model: 'per_person', cost_per_person: 120 },
]

/** Swaps window.fetch for the Promo Studio routes; returns the undo. */
export function installFakePromoApi(assets: PromoAsset[]): () => void {
  const realFetch = window.fetch.bind(window)
  const definition = buildPrecisionWorkshopDefinition()
  let revision = 1

  const requests: { url: string; method: string; body: unknown }[] = []
  ;(window as unknown as { __promoRequests: typeof requests }).__promoRequests = requests

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname + input.search : input.url
    const method = (init?.method ?? 'GET').toUpperCase()
    if (url.startsWith('/api/')) {
      let body: unknown = null
      try {
        body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      } catch {
        body = null
      }
      requests.push({ url, method, body })
    }
    if (url.startsWith('/api/classes')) return json(200, { classes: SAMPLE_CLASSES })
    if (url === '/api/admin/promo/templates/t1') {
      return json(200, {
        template: { id: 't1', slug: 'precision-workshop', name: definition.name, status: 'active' },
        definition,
        draft: null,
        currentVersion: 1,
        versions: [{ id: 'v1', version: 1, notes: 'Built-in template', published_at: '2026-10-09T12:00:00Z' }],
      })
    }
    if (url === '/api/admin/promo/templates/t1/draft' && method === 'PUT') {
      return json(200, { draft: { id: 'd1', version: 2, updated_at: new Date().toISOString() } })
    }
    if (url === '/api/admin/promo/templates/t1/publish') return json(200, { published: { id: 'd1', version: 2 } })
    if (url === '/api/promo/brand-kit') {
      return json(200, { tokens: method === 'PUT' ? (JSON.parse(String(init?.body)) as { tokens: unknown }).tokens : DEFAULT_BRAND_TOKENS })
    }
    if (!url.startsWith('/api/promo/')) return realFetch(input, init)
    if (url === '/api/promo/me') return json(200, { ownerId: DEV_OWNER, isAdmin: true, name: 'Dev' })
    if (url === '/api/promo/assets' && method === 'GET') return json(200, { assets })
    if (url === '/api/promo/templates') {
      return json(200, {
        templates: [{ id: 't1', slug: 'precision-workshop', name: definition.name, versionId: 'dev-version', version: 1, definition }],
        brand: DEFAULT_BRAND_TOKENS,
      })
    }
    if (url === '/api/promo/generate') {
      const brief = JSON.parse(String(init?.body)) as PromoBrief
      const picked = assets.filter((asset) => brief.photoIds.includes(asset.id))
      const facts = factValues(definition, brief)
      const encoder = new TextEncoder()
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const [index, item] of ANGLE_COPY.entries()) {
            await new Promise((resolve) => setTimeout(resolve, 400))
            const variation: Variation = {
              ...item.variation,
              photos: {
                hero: picked[index % picked.length].id,
                strip: picked.filter((_, i) => i !== index % picked.length).map((asset) => asset.id).slice(0, 4),
              },
            }
            const document = documentFromVariation(definition, facts, variation, picked)
            controller.enqueue(
              encoder.encode(`${JSON.stringify({ type: 'variation', index, angle: item.angle, label: item.label, document, callId: null })}\n`)
            )
          }
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ type: 'done', produced: 3, fallback: null, message: null, templateVersionId: 'dev-version' })}\n`)
          )
          controller.close()
        },
      })
      return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } })
    }
    if (url === '/api/promo/designs' && method === 'POST') return json(201, { design: { id: 'dev-design' } })
    if (/\/api\/promo\/designs\/[^/]+\/revise$/.test(url)) {
      const body = JSON.parse(String(init?.body)) as { instruction: string; document: DesignDocument }
      const outcome = applyRevision(
        { definition, brand: DEFAULT_BRAND_TOKENS, document: body.document, instruction: body.instruction, photos: assets },
        [
          { op: 'set_variant', variant: body.document.variant === 'noir' ? 'ivory' : 'noir' },
          { op: 'set_photo_look', slot: 'hero', look: 'dramatic' },
          { op: 'set_copy', slot: 'tagline', value: 'Darker. Sharper.' },
        ],
        { bannedWords: DEFAULT_BRAND_TOKENS.voice.bannedWords, sessionCount: 3 }
      )
      return json(200, {
        document: outcome.document,
        summary: 'Switched the color and gave the hero a dramatic look.',
        applied: outcome.applied,
        skipped: outcome.skipped,
        changed: outcome.applied.length > 0,
      })
    }
    if (/\/api\/promo\/designs\/[^/]+$/.test(url) && method === 'PATCH') {
      revision += 1
      return json(200, { revision, updated_at: new Date().toISOString() })
    }
    if (url.endsWith('/revisions') || url.endsWith('/thumbnail')) return json(201, {})
    return json(404, { error: 'Not in the dev harness' })
  }
  return () => {
    window.fetch = realFetch
  }
}
