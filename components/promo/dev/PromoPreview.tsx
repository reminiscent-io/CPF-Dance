'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, SegmentedControl } from '@/components/ui'
import { PromoCanvas } from '@/components/promo/PromoCanvas'
import { DEFAULT_BRAND_TOKENS } from '@/lib/promo/brand'
import { exampleDocument, placementFor } from '@/lib/promo/document'
import { FORMAT_SPECS } from '@/lib/promo/formats'
import { canvasMeasure, loadFontsForLayout } from '@/lib/promo/client/fonts'
import { exportFilename, exportImage, exportPosterPdf, shareOrDownload } from '@/lib/promo/client/export'
import { buildScene } from '@/lib/promo/layout/scene'
import { buildPrecisionWorkshopDefinition } from '@/lib/promo/templates/precision-workshop'
import type { DesignDocument, PhotoPlacement, PromoFormat, SessionValue } from '@/lib/promo/types'
import { createSamplePhotos, type SamplePhoto } from './sample-photos'

const SESSIONS: SessionValue[] = [
  { weekday: 'Fri', date: 'Nov 13', time: '5:00–7:00 PM' },
  { weekday: 'Sat', date: 'Nov 14', time: '11:00 AM – 1:00 PM' },
  { weekday: 'Sun', date: 'Nov 15', time: '11:00 AM – 1:00 PM' },
  { weekday: 'Mon', date: 'Nov 16', time: '6:30–8:00 PM' },
]

const PILLS = [
  'Kick technique & flexibility',
  'Precision drills & cleanliness',
  'Strength & conditioning',
  'Styling & performance',
  'Turns & spotting',
  'Stage presence',
]

/**
 * Development-only harness: renders Template #1 with stand-in photos in every
 * format, variant and repeater count, and exports files, without auth or a
 * database. Lives at /dev/promo.
 */
export default function PromoPreview() {
  const definition = useMemo(() => buildPrecisionWorkshopDefinition(), [])
  const [format, setFormat] = useState<PromoFormat>('ig_post')
  const [variant, setVariant] = useState('ivory')
  const [dates, setDates] = useState(3)
  const [pills, setPills] = useState(4)
  // Client-only component (loaded with ssr: false), so canvases are available.
  const [photos] = useState<SamplePhoto[]>(() => createSamplePhotos())
  const [fontsReady, setFontsReady] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let cancelled = false
    const layouts = Object.values(definition.formats).filter(Boolean)
    Promise.all(layouts.map((layout) => loadFontsForLayout(layout!, DEFAULT_BRAND_TOKENS)))
      .then(() => {
        if (!cancelled) setFontsReady(true)
      })
      .catch(() => {
        if (!cancelled) setStatus('Fonts failed to load')
      })
    return () => {
      cancelled = true
    }
  }, [definition])

  const document = useMemo<DesignDocument>(() => {
    const base = exampleDocument(definition)
    const [hero, ...rest] = photos
    const placements: Record<string, PhotoPlacement[]> = hero
      ? {
          hero: [placementFor({ id: hero.id, pose: { source: 'pose', subject: { x: 0.3, y: 0.05, w: 0.4, h: 0.9 } } })],
          strip: rest.map((photo) => placementFor({ id: photo.id })),
        }
      : {}
    return {
      ...base,
      variant,
      values: {
        ...base.values,
        sessions: SESSIONS.slice(0, dates),
        pills: PILLS.slice(0, pills),
      },
      photos: placements,
    }
  }, [definition, photos, variant, dates, pills])

  const images = useMemo(
    () => Object.fromEntries(photos.map((photo) => [photo.id, photo.canvas as CanvasImageSource])),
    [photos]
  )
  const assets = useMemo(
    () => Object.fromEntries(photos.map((photo) => [photo.id, { width: photo.width, height: photo.height }])),
    [photos]
  )

  const scene = useMemo(() => {
    if (!fontsReady) return null
    return buildScene({ definition, format, document, brand: DEFAULT_BRAND_TOKENS, measure: canvasMeasure, assets })
  }, [definition, format, document, fontsReady, assets])

  const runExport = async () => {
    if (!scene) return
    setStatus('Rendering…')
    const started = performance.now()
    try {
      const spec = FORMAT_SPECS[format]
      const blob =
        format === 'poster'
          ? await exportPosterPdf(scene, images, { title: 'Precision Workshop', widthInches: 11, heightInches: 17 })
          : await exportImage(scene, images, { type: 'image/png' })
      const kind = format === 'poster' ? 'pdf' : 'png'
      const result = await shareOrDownload({ blob, filename: exportFilename('Precision Workshop', format, kind) })
      setStatus(
        `${result}: ${spec.width}×${spec.height}, ${(blob.size / 1024 / 1024).toFixed(2)} MB in ${Math.round(performance.now() - started)} ms`
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Export failed')
    }
  }

  const displayWidth = format === 'ig_post' ? 540 : format === 'ig_story' ? 405 : 440

  return (
    <div className="min-h-screen bg-champagne-100 p-6">
      <div className="flex flex-wrap items-center gap-3 mb-5" data-testid="promo-preview-controls">
        <SegmentedControl<PromoFormat>
          aria-label="Format"
          options={[
            { value: 'ig_post', label: 'Post' },
            { value: 'ig_story', label: 'Story' },
            { value: 'poster', label: 'Poster' },
          ]}
          value={format}
          onChange={setFormat}
        />
        <SegmentedControl<string>
          aria-label="Variant"
          options={[
            { value: 'ivory', label: 'Ivory' },
            { value: 'noir', label: 'Noir' },
          ]}
          value={variant}
          onChange={setVariant}
        />
        <label className="text-sm text-charcoal-700">
          Dates{' '}
          <input type="number" min={1} max={4} value={dates} onChange={(e) => setDates(Number(e.target.value))} className="w-14 ml-1" />
        </label>
        <label className="text-sm text-charcoal-700">
          Pills{' '}
          <input type="number" min={2} max={6} value={pills} onChange={(e) => setPills(Number(e.target.value))} className="w-14 ml-1" />
        </label>
        <Button size="sm" onClick={runExport} disabled={!scene} data-testid="promo-export">
          Export
        </Button>
        <span className="text-sm text-charcoal-700" data-testid="promo-status">
          {status}
        </span>
      </div>
      {scene ? (
        <div data-testid="promo-stage" className="inline-block shadow-soft">
          <PromoCanvas scene={scene} images={images} displayWidth={displayWidth} />
        </div>
      ) : (
        <p className="text-charcoal-700">Loading fonts…</p>
      )}
      {scene && scene.warnings.length > 0 ? (
        <ul className="mt-4 text-sm text-ballet-pink-800" data-testid="promo-warnings">
          {scene.warnings.map((warning, index) => (
            <li key={index}>{warning.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
