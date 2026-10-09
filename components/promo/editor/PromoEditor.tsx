'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStore } from 'zustand'
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Button, SegmentedControl, useToast } from '@/components/ui'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { completeBrandTokens } from '@/lib/promo/brand'
import { createAutosaver, type Autosaver, type SaveStatus } from '@/lib/promo/client/autosave'
import { createEditorStore } from '@/lib/promo/client/editor-store'
import { canvasMeasure, loadFontsForLayout } from '@/lib/promo/client/fonts'
import type { Rendition } from '@/lib/promo/client/images'
import { loadPlannedImages, planKey, planSceneImages } from '@/lib/promo/client/scene-images'
import { getSlot, setNudge } from '@/lib/promo/document'
import { FORMAT_SPECS } from '@/lib/promo/formats'
import { applyNudge, buildScene, textLayoutChanged, type SceneNode, type SceneText } from '@/lib/promo/layout/scene'
import { PROMO_FORMATS, type Box, type PromoAsset, type PromoFormat } from '@/lib/promo/types'
import { promoFetch } from '../hooks'
import { AskAi, useRevise } from './AskAi'
import { ContentPanel } from './ContentPanel'
import { EditorCanvas } from './EditorCanvas'
import {
  EditorProvider,
  useElementSize,
  useMediaQuery,
  useViewportHeight,
  type EditorContextValue,
  type EditorData,
} from './EditorContext'
import { ExportPanel } from './ExportPanel'
import { InlineTextEditor } from './InlineTextEditor'
import { LayerList } from './LayerList'
import { PhotosPanel } from './PhotosPanel'
import { StylePanel } from './StylePanel'
import { readTarget, targetKey, textEditTarget, writeTarget, type TextEditTarget } from './textEdits'
import { EditorSkeleton } from './EditorSkeleton'
import { useDesignThumbnail } from './useDesignThumbnail'

type Tab = 'content' | 'photos' | 'style' | 'export'

const TABS: { value: Tab; label: string }[] = [
  { value: 'content', label: 'Content' },
  { value: 'photos', label: 'Photos' },
  { value: 'style', label: 'Style' },
  { value: 'export', label: 'Export' },
]

const STATUS_LABELS: Record<SaveStatus, string> = {
  saved: 'Saved',
  pending: 'Saving…',
  saving: 'Saving…',
  offline: 'Offline. Saves when you’re back.',
  error: 'Couldn’t save. Retrying.',
  conflict: 'Changed elsewhere',
}

/**
 * Holds the session's autosaver for callbacks (publish, format siblings, the
 * title field). The autosaver itself lives in an effect, since it subscribes
 * to the store and the window.
 */
class SaverSlot {
  private saver: Autosaver | null = null
  constructor(private readonly initialRevision: number) {}
  attach(saver: Autosaver | null) {
    this.saver = saver
  }
  flush(): Promise<void> {
    return this.saver?.flush() ?? Promise.resolve()
  }
  revision(): number {
    return this.saver?.revision() ?? this.initialRevision
  }
  setTitle(title: string) {
    this.saver?.setTitle(title)
  }
}

export default function PromoEditor({ designId }: { designId: string }) {
  const { data, error, refetch } = useAsyncData<EditorData>(
    (signal) => promoFetch<EditorData>(`/api/promo/designs/${designId}`, { signal }),
    [designId]
  )
  if (error) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-xl text-charcoal-700">{error}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="outline" onClick={refetch}>
            Try again
          </Button>
          <Link href="/instructor/promo" className="inline-flex min-h-control items-center px-4 text-charcoal-500 hover:text-rose-700">
            Back to promos
          </Link>
        </div>
      </div>
    )
  }
  if (!data) return <EditorSkeleton />
  return <EditorSession key={`${data.design.id}:${data.design.revision}`} data={data} onReload={refetch} />
}

export function EditorSession({ data, onReload }: { data: EditorData; onReload: () => void }) {
  const router = useRouter()
  const { addToast } = useToast()
  const { design, template } = data
  const definition = template.definition
  const layout = definition.formats[design.format]
  const brand = useMemo(() => completeBrandTokens(design.brand_snapshot), [design.brand_snapshot])

  const [store] = useState(() => createEditorStore(design.document))
  const doc = useStore(store, (state) => state.document)
  const selected = useStore(store, (state) => state.selected)
  const version = useStore(store, (state) => state.version)
  const canUndo = useStore(store.temporal, (state) => state.pastStates.length > 0)
  const canRedo = useStore(store.temporal, (state) => state.futureStates.length > 0)

  const [assets, setAssets] = useState<Record<string, PromoAsset>>(() =>
    Object.fromEntries(data.assets.map((asset) => [asset.id, asset]))
  )
  const addAssets = useCallback((list: PromoAsset[]) => {
    setAssets((current) => {
      const next = { ...current }
      for (const asset of list) next[asset.id] = asset
      return next
    })
  }, [])

  const [fonts, setFonts] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [title, setTitle] = useState(design.title)
  const [tab, setTab] = useState<Tab>('content')
  const [editing, setEditing] = useState<{ node: SceneText; target: TextEditTarget } | null>(null)
  const [making, setMaking] = useState(false)
  const [saverSlot] = useState(() => new SaverSlot(design.revision))
  const revise = useRevise(store, design.id)
  const canvasBox = useRef<HTMLDivElement>(null)
  const { width: boxWidth } = useElementSize(canvasBox)
  const viewportHeight = useViewportHeight()
  const wide = useMediaQuery('(min-width: 1024px)')
  const finePointer = useMediaQuery('(pointer: fine)')
  const direct = wide && finePointer

  useEffect(() => {
    const saver = createAutosaver({
      store,
      designId: design.id,
      revision: design.revision,
      title: design.title,
      onStatus: setStatus,
    })
    saverSlot.attach(saver)
    const onPageHide = () => saver.flushOnExit()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void saver.flush()
    }
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibility)
      saverSlot.attach(null)
      void saver.flush().finally(() => saver.dispose())
    }
  }, [store, saverSlot, design.id, design.revision, design.title])

  useEffect(() => {
    if (!layout) return
    let cancelled = false
    loadFontsForLayout(layout, brand)
      .then(() => {
        if (!cancelled) setFonts('ready')
      })
      .catch(() => {
        if (!cancelled) setFonts('failed')
      })
    return () => {
      cancelled = true
    }
  }, [layout, brand])

  const dims = useMemo(
    () => Object.fromEntries(Object.values(assets).map((asset) => [asset.id, { width: asset.width, height: asset.height }])),
    [assets]
  )

  const scene = useMemo(
    () =>
      fonts === 'ready' && layout
        ? buildScene({ definition, format: design.format, document: doc, brand, measure: canvasMeasure, assets: dims })
        : null,
    [fonts, layout, definition, design.format, doc, brand, dims]
  )

  // Line breaks computed here are saved, so every device draws the same ones.
  useEffect(() => {
    if (scene && textLayoutChanged(doc.layout, scene.textLayout)) store.getState().setLayout(scene.textLayout)
  }, [scene, doc.layout, store])

  const aspect = layout ? layout.width / layout.height : 0.8
  const maxCanvasHeight = wide ? viewportHeight - 190 : viewportHeight * 0.58
  const displayWidth = Math.floor(Math.max(160, Math.min(boxWidth || 360, maxCanvasHeight * aspect)))

  // Screen-size renditions for the canvas; exports load their own at full size.
  const [pixelRatio] = useState(() => Math.min(window.devicePixelRatio || 1, 3))
  const plan = useMemo(
    () => (scene && layout ? planSceneImages(scene, assets, (displayWidth / layout.width) * pixelRatio) : []),
    [scene, assets, displayWidth, layout, pixelRatio]
  )
  const imageKey = planKey(plan)
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({})
  useEffect(() => {
    let cancelled = false
    const items = imageKey
      ? imageKey.split('|').map((entry) => {
          const [assetId, rendition] = entry.split(':')
          return { assetId, rendition: rendition as Rendition }
        })
      : []
    loadPlannedImages(items, assets).then((loaded) => {
      if (!cancelled) setImages(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [imageKey, assets])

  useDesignThumbnail({
    designId: design.id,
    ownerId: design.owner_id,
    hasThumbnail: Boolean(design.thumbnail_updated_at),
    status,
    version,
    scene,
    images,
    plan,
  })

  const reveal = useCallback(
    (slotId: string | undefined) => {
      if (!slotId) return
      const slot = getSlot(definition, slotId)
      setTab(slot?.binding === 'photo' ? 'photos' : 'content')
    },
    [definition]
  )

  const onSelect = useCallback(
    (node: SceneNode | null) => {
      const state = store.getState()
      if (!node) {
        state.select(null)
        return
      }
      const slotId = node.type === 'text' || node.type === 'photo' ? node.slotId : undefined
      state.select(node.rootLayerId, slotId)
      reveal(slotId)
    },
    [store, reveal]
  )

  const onEditText = useCallback(
    (node: SceneText) => {
      const target = textEditTarget(node, definition)
      if (target) setEditing({ node, target })
      else reveal(node.slotId)
    },
    [definition, reveal]
  )

  const editLayer = (layerId: string) => {
    const node = scene?.nodes.find(
      (candidate): candidate is SceneText => candidate.rootLayerId === layerId && candidate.type === 'text'
    )
    if (node && direct) onEditText(node)
    else {
      const layer = layout?.layers.find((item) => item.id === layerId)
      reveal(layer && 'slot' in layer ? layer.slot : undefined)
    }
  }

  const onCommitBox = useCallback(
    (layerId: string, box: Box) => store.getState().apply((d) => setNudge(d, layerId, box)),
    [store]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const inField = target?.closest('input, textarea, select, [contenteditable="true"]')
      const designField = target?.closest('[data-promo-field]')
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (mod && (key === 'z' || key === 'y') && (!inField || designField)) {
        event.preventDefault()
        if (key === 'y' || event.shiftKey) store.getState().redo()
        else store.getState().undo()
        return
      }
      if (inField) return
      const state = store.getState()
      if (event.key === 'Escape') {
        state.select(null)
        return
      }
      if (!direct || !state.selected || !layout) return
      const step = event.shiftKey ? 10 : 1
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }
      const delta = moves[event.key]
      const layer = layout.layers.find((item) => item.id === state.selected)
      if (!delta || !layer) return
      event.preventDefault()
      state.apply((d) => {
        const box = applyNudge(layer.box, d.nudges[layer.id])
        return setNudge(d, layer.id, { ...box, x: box.x + delta[0], y: box.y + delta[1] })
      }, `nudge:${layer.id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store, direct, layout])

  const makeFormats = async (formats: PromoFormat[]) => {
    setMaking(true)
    try {
      await saverSlot.flush()
      const { designs } = await promoFetch<{ designs: { id: string; format: PromoFormat }[] }>(
        `/api/promo/designs/${design.id}/siblings`,
        { method: 'POST', json: { formats } }
      )
      const next = designs.find((item) => item.format === formats[0]) ?? designs[0]
      if (next) router.push(`/instructor/promo/${next.id}`)
      else setMaking(false)
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'That didn’t work. Try again.', 'error')
      setMaking(false)
    }
  }

  const flushSave = useCallback(() => saverSlot.flush(), [saverSlot])
  const currentRevision = useCallback(() => saverSlot.revision(), [saverSlot])

  const context = useMemo<EditorContextValue | null>(
    () =>
      layout
        ? {
            store,
            data,
            definition,
            layout,
            brand,
            scene,
            images,
            assets,
            addAssets,
            flushSave,
            revision: currentRevision,
          }
        : null,
    [store, data, definition, layout, brand, scene, images, assets, addAssets, flushSave, currentRevision]
  )

  if (!layout || !context) {
    return <p className="py-16 text-center text-charcoal-500">This template has no {FORMAT_SPECS[design.format].label} layout.</p>
  }

  const formats = PROMO_FORMATS.filter((format) => definition.formats[format])
  const missing = formats.filter((format) => !data.siblings.some((sibling) => sibling.format === format))
  const warnings = scene?.warnings ?? []
  // Copy that overflows can be shortened by the AI; naming the fields unlocks ones she wrote.
  const tooLong = [
    ...new Set(
      warnings
        .map((warning) => (warning.slotId ? getSlot(definition, warning.slotId) : undefined))
        .filter((slot) => slot?.binding === 'copy')
        .map((slot) => slot!.label.toLowerCase())
    ),
  ]
  const editingNode = editing?.node

  return (
    <EditorProvider value={context}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/instructor/promo" className="text-sm text-charcoal-500 hover:text-rose-700">
          ← Promos
        </Link>
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs text-charcoal-500" role="status" aria-live="polite">
            {STATUS_LABELS[status]}
          </span>
          <Button size="sm" variant="ghost" onClick={() => store.getState().undo()} disabled={!canUndo} aria-label="Undo">
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => store.getState().redo()} disabled={!canRedo} aria-label="Redo">
            <ArrowUturnRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <input
        aria-label="Promo name"
        value={title}
        maxLength={200}
        onChange={(event) => {
          setTitle(event.target.value)
          if (event.target.value.trim()) saverSlot.setTitle(event.target.value.trim())
        }}
        className="mt-2 w-full rounded-md bg-transparent font-serif text-3xl font-semibold tracking-[-0.02em] text-charcoal-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
      />

      <nav aria-label="Formats" className="mt-3 flex flex-wrap items-center gap-2">
        {formats.map((format) => {
          const sibling = data.siblings.find((item) => item.format === format)
          const current = format === design.format
          if (sibling) {
            return (
              <Link
                key={format}
                href={`/instructor/promo/${sibling.id}`}
                aria-current={current ? 'page' : undefined}
                className={`inline-flex min-h-9 items-center rounded px-3 text-sm font-medium transition-colors ${
                  current ? 'bg-ballet-pink-100 text-ballet-pink-800' : 'bg-champagne-100 text-charcoal-600 hover:bg-champagne-200'
                }`}
              >
                {FORMAT_SPECS[format].shortLabel}
              </Link>
            )
          }
          return (
            <button
              key={format}
              type="button"
              onClick={() => makeFormats([format])}
              disabled={making}
              className="inline-flex min-h-9 items-center gap-1 rounded border border-dashed border-champagne-300 px-3 text-sm text-charcoal-600 transition-colors hover:bg-champagne-100 disabled:opacity-60"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              Make {FORMAT_SPECS[format].shortLabel.toLowerCase()}
            </button>
          )
        })}
        {missing.length > 1 && (
          <Button size="sm" variant="ghost" onClick={() => makeFormats(missing)} disabled={making}>
            Make all formats
          </Button>
        )}
      </nav>

      {status === 'conflict' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-ballet-pink-100 px-4 py-3 text-sm text-ballet-pink-900" role="alert">
          <p className="flex-1">
            This promo was saved on another device or tab, so this copy stopped saving. Reload to get the latest version.
          </p>
          <Button size="sm" onClick={onReload}>
            Reload
          </Button>
        </div>
      )}

      <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
        <div ref={canvasBox} className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          {warnings.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-ballet-pink-100 px-3 py-2 text-sm text-ballet-pink-900">
              <button
                type="button"
                onClick={() => {
                  store.getState().select(warnings[0].layerId, warnings[0].slotId)
                  reveal(warnings[0].slotId)
                }}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {warnings.length === 1 ? warnings[0].message : `${warnings.length} items don’t fit their space. Tap to see the first.`}
              </button>
              {tooLong.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={revise.busy}
                  onClick={() =>
                    void revise.submit(
                      `Shorten the ${tooLong.join(' and the ')} so ${tooLong.length === 1 ? 'it fits' : 'they fit'} the space.`
                    )
                  }
                >
                  {revise.busy ? 'Shortening…' : 'Shorten with AI'}
                </Button>
              )}
            </div>
          )}
          {fonts === 'failed' ? (
            <div className="rounded-lg border border-champagne-200 bg-champagne-100 px-4 py-10 text-center">
              <p className="text-charcoal-700">The promo fonts didn’t load. Check your connection and reload.</p>
            </div>
          ) : scene ? (
            <div className="mx-auto shadow-soft" style={{ width: displayWidth }}>
              <EditorCanvas
                scene={scene}
                images={images}
                layout={layout}
                nudges={doc.nudges}
                displayWidth={displayWidth}
                selected={selected}
                direct={direct}
                onSelect={onSelect}
                onCommitBox={onCommitBox}
                onEditText={onEditText}
                overlay={
                  editing && editingNode ? (
                    <InlineTextEditor
                      node={editingNode}
                      scale={displayWidth / layout.width}
                      value={readTarget(editing.target, doc, brand)}
                      multiline={editing.target.kind === 'value' && (editing.target.slot.maxChars ?? 0) > 60}
                      label={editing.target.slot.label}
                      onChange={(text) =>
                        store.getState().apply((d) => writeTarget(editing.target, d, brand, text), targetKey(editing.target))
                      }
                      onDone={() => setEditing(null)}
                    />
                  ) : null
                }
              />
            </div>
          ) : (
            <div
              className="skeleton-shimmer mx-auto rounded-lg"
              style={{ width: displayWidth, aspectRatio: `${layout.width} / ${layout.height}` }}
            />
          )}
          {!direct && (
            <p className="mt-2 text-center text-xs text-charcoal-500">Tap any part of the design to edit it.</p>
          )}
        </div>

        <div className="mt-6 min-w-0 lg:mt-0">
          <AskAi revise={revise} onUndo={() => store.getState().undo()} />
          <div className="mt-4">
            <SegmentedControl<Tab> aria-label="Editor panels" options={TABS} value={tab} onChange={setTab} />
          </div>
          <div className="mt-5">
            {tab === 'content' && <ContentPanel />}
            {tab === 'photos' && <PhotosPanel />}
            {tab === 'style' && <StylePanel />}
            {tab === 'export' && <ExportPanel />}
          </div>
          {direct && (
            <div className="mt-8">
              <LayerList onEdit={editLayer} />
            </div>
          )}
        </div>
      </div>
    </EditorProvider>
  )
}
