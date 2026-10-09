'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useStore } from 'zustand'
import { ArrowUturnLeftIcon, ArrowUturnRightIcon } from '@heroicons/react/24/outline'
import { Button, ConfirmDialog, SegmentedControl, useToast } from '@/components/ui'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { canvasMeasure, loadFontsForLayout } from '@/lib/promo/client/fonts'
import { createTemplateStore } from '@/lib/promo/client/template-store'
import { FORMAT_SPECS } from '@/lib/promo/formats'
import { buildScene } from '@/lib/promo/layout/scene'
import { checkTemplateIntegrity, TemplateDefinitionSchema } from '@/lib/promo/schema'
import {
  addLayer,
  duplicateLayer,
  moveLayer,
  removeLayer,
  setLayerBox,
  STAND_IN_PHOTOS,
  stressDocument,
  updateLayer,
  updateSlot,
  type StressOptions,
} from '@/lib/promo/template-edits'
import { PROMO_FORMATS, type BrandTokens, type PromoFormat, type TemplateDefinition } from '@/lib/promo/types'
import { EditorCanvas } from '../editor/EditorCanvas'
import { useElementSize, useMediaQuery, useViewportHeight } from '../editor/EditorContext'
import { promoFetch, PromoRequestError } from '../hooks'
import { LayerInspector } from './LayerInspector'
import { SlotsPanel } from './SlotsPanel'

interface TemplateData {
  template: { id: string; slug: string; name: string; status: string }
  definition: TemplateDefinition
  draft: { id: string; version: number; notes: string | null; updatedAt: string } | null
  currentVersion: number | null
  versions: { id: string; version: number; notes: string | null; published_at: string }[]
}

type Panel = 'layer' | 'slots' | 'json' | 'history'
type SaveState = 'saved' | 'pending' | 'saving' | 'error'

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export default function TemplateEditor({ templateId }: { templateId: string }) {
  const { data, error, refetch } = useAsyncData<{ template: TemplateData; brand: BrandTokens }>(async (signal) => {
    const [template, kit] = await Promise.all([
      promoFetch<TemplateData>(`/api/admin/promo/templates/${templateId}`, { signal }),
      promoFetch<{ tokens: BrandTokens }>('/api/promo/brand-kit', { signal }),
    ])
    return { template, brand: kit.tokens }
  }, [templateId])
  const wide = useMediaQuery('(min-width: 1024px)')

  if (!wide) {
    return (
      <p className="py-16 text-center text-charcoal-600">
        The template editor needs a laptop-size screen. Promos themselves can be edited on a phone.
      </p>
    )
  }
  if (error) return <p className="py-16 text-center text-charcoal-600">{error}</p>
  if (!data) return <div className="skeleton-shimmer h-96 rounded-lg" aria-busy="true" />
  return (
    <TemplateSession
      key={`${data.template.draft?.id ?? 'live'}:${data.template.currentVersion}`}
      data={data.template}
      brand={data.brand}
      onReload={refetch}
    />
  )
}

function TemplateSession({ data, brand, onReload }: { data: TemplateData; brand: BrandTokens; onReload: () => void }) {
  const { addToast } = useToast()
  const [store] = useState(() => createTemplateStore(data.definition))
  const definition = useStore(store, (state) => state.definition)
  const selected = useStore(store, (state) => state.selected)
  const canUndo = useStore(store.temporal, (state) => state.pastStates.length > 0)
  const canRedo = useStore(store.temporal, (state) => state.futureStates.length > 0)
  const [format, setFormat] = useState<PromoFormat>('ig_post')
  const [stress, setStress] = useState<StressOptions>({
    sessions: 3,
    lists: 'usual',
    longest: false,
    variant: data.definition.defaultVariant,
  })
  const [panel, setPanel] = useState<Panel>('layer')
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(Boolean(data.draft))
  const [fontsReady, setFontsReady] = useState<PromoFormat | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [notes, setNotes] = useState('')
  const [json, setJson] = useState<{ text: string; error: string | null } | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saving = useRef<Promise<void>>(Promise.resolve())
  const canvasBox = useRef<HTMLDivElement>(null)
  const { width: boxWidth } = useElementSize(canvasBox)
  const viewportHeight = useViewportHeight()

  const layout = definition.formats[format]

  const saveDraft = () => {
    saving.current = saving.current.then(async () => {
      setSaveState('saving')
      try {
        await promoFetch(`/api/admin/promo/templates/${data.template.id}/draft`, {
          method: 'PUT',
          json: { definition: store.getState().definition },
        })
        setHasDraft(true)
        setSaveError(null)
        setSaveState('saved')
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Couldn’t save the draft.')
        setSaveState('error')
      }
    })
    return saving.current
  }

  // The subscription outlives renders; it calls whichever saveDraft is current.
  const saveDraftRef = useRef(saveDraft)
  useEffect(() => {
    saveDraftRef.current = saveDraft
  })
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.definition === previous.definition) return
        setSaveState('pending')
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          saveTimer.current = null
          void saveDraftRef.current()
        }, 1500)
      }),
    [store]
  )

  useEffect(() => {
    if (!layout) return
    let cancelled = false
    loadFontsForLayout(layout, brand)
      .then(() => {
        if (!cancelled) setFontsReady(format)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [layout, brand, format])

  const document = useMemo(() => stressDocument(definition, stress), [definition, stress])
  const scene = useMemo(
    () =>
      layout && fontsReady === format
        ? buildScene({ definition, format, document, brand, measure: canvasMeasure, assets: STAND_IN_PHOTOS })
        : null,
    [layout, fontsReady, format, definition, document, brand]
  )
  const problems = useMemo(() => checkTemplateIntegrity(definition), [definition])
  const selectedLayer = layout?.layers.find((layer) => layer.id === selected) ?? null

  const aspect = layout ? layout.width / layout.height : 0.8
  const displayWidth = Math.floor(Math.max(200, Math.min(boxWidth || 480, (viewportHeight - 220) * aspect)))

  const flushSave = async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
      await saveDraft()
    }
    await saving.current
  }

  const publish = async () => {
    setPublishing(true)
    try {
      await flushSave()
      await promoFetch(`/api/admin/promo/templates/${data.template.id}/publish`, { method: 'POST', json: { notes } })
      addToast('Published. New promos use this version; saved ones keep theirs.', 'success')
      setConfirmPublish(false)
      onReload()
    } catch (error) {
      const message = error instanceof PromoRequestError || error instanceof Error ? error.message : 'Publishing failed.'
      addToast(message, 'error')
    } finally {
      setPublishing(false)
    }
  }

  const discard = async () => {
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      await saving.current
      await promoFetch(`/api/admin/promo/templates/${data.template.id}/draft`, { method: 'DELETE' })
      setConfirmDiscard(false)
      onReload()
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Couldn’t discard the draft.', 'error')
    }
  }

  const applyJson = () => {
    if (!json) return
    try {
      const parsed = TemplateDefinitionSchema.safeParse(JSON.parse(json.text))
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        setJson({ ...json, error: `${issue?.path.join('.') || 'definition'}: ${issue?.message}` })
        return
      }
      store.getState().replace(parsed.data as TemplateDefinition)
      setJson(null)
      addToast('Applied', 'success')
    } catch {
      setJson({ ...json, error: 'That isn’t valid JSON.' })
    }
  }

  const statusLabel =
    saveState === 'saving' || saveState === 'pending'
      ? 'Saving draft…'
      : saveState === 'error'
        ? (saveError ?? 'Couldn’t save the draft.')
        : hasDraft
          ? `Draft saved${data.draft ? ` (version ${data.draft.version})` : ''}`
          : 'No changes yet'

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/promo/templates" className="text-sm text-charcoal-500 hover:text-rose-700">
          ← Templates
        </Link>
        <div className="flex items-center gap-1">
          <span className={`mr-2 text-xs ${saveState === 'error' ? 'text-rose-700' : 'text-charcoal-500'}`} role="status">
            {statusLabel}
          </span>
          <Button size="sm" variant="ghost" aria-label="Undo" disabled={!canUndo} onClick={() => store.getState().undo()}>
            <ArrowUturnLeftIcon className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label="Redo" disabled={!canRedo} onClick={() => store.getState().redo()}>
            <ArrowUturnRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-[-0.02em] text-charcoal-950">{data.template.name}</h1>
          <p className="mt-1 text-sm text-charcoal-500">
            Live: version {data.currentVersion ?? '–'}. Saved promos stay on the version they were made with.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasDraft && (
            <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>
              Discard draft
            </Button>
          )}
          <Button onClick={() => setConfirmPublish(true)} disabled={!hasDraft || problems.length > 0 || publishing}>
            Publish
          </Button>
        </div>
      </div>

      {problems.length > 0 && (
        <div className="mt-4 rounded-lg bg-ballet-pink-100 px-4 py-3 text-sm text-ballet-pink-900" role="alert">
          <p className="font-medium">Fix these before publishing:</p>
          <ul className="mt-1 list-disc pl-5">
            {problems.slice(0, 6).map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegmentedControl<PromoFormat>
          aria-label="Format"
          options={PROMO_FORMATS.filter((item) => definition.formats[item]).map((item) => ({
            value: item,
            label: FORMAT_SPECS[item].shortLabel,
          }))}
          value={format}
          onChange={(next) => {
            setFormat(next)
            store.getState().select(null)
          }}
        />
        <SegmentedControl<string>
          aria-label="Dates in the preview"
          options={['1', '2', '3', '4'].map((count) => ({ value: count, label: `${count} ${count === '1' ? 'date' : 'dates'}` }))}
          value={String(stress.sessions)}
          onChange={(value) => setStress((current) => ({ ...current, sessions: Number(value) }))}
        />
        <SegmentedControl<StressOptions['lists']>
          aria-label="List items in the preview"
          options={[
            { value: 'fewest', label: 'Fewest' },
            { value: 'usual', label: 'Usual' },
            { value: 'most', label: 'Most' },
          ]}
          value={stress.lists}
          onChange={(lists) => setStress((current) => ({ ...current, lists }))}
        />
        <label className="flex items-center gap-2 text-sm text-charcoal-700">
          <input
            type="checkbox"
            checked={stress.longest}
            onChange={(event) => setStress((current) => ({ ...current, longest: event.target.checked }))}
            className="h-4 w-4 accent-rose-600"
          />
          Longest copy
        </label>
        <SegmentedControl<string>
          aria-label="Variant"
          options={Object.entries(definition.variants).map(([value, variant]) => ({ value, label: variant.label }))}
          value={stress.variant}
          onChange={(variant) => setStress((current) => ({ ...current, variant }))}
        />
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_400px] gap-8">
        <div ref={canvasBox} className="min-w-0">
          {scene && layout ? (
            <>
              <div className="mx-auto shadow-soft" style={{ width: displayWidth }}>
                <EditorCanvas
                  scene={scene}
                  images={{}}
                  layout={layout}
                  nudges={{}}
                  displayWidth={displayWidth}
                  selected={selected}
                  direct
                  onSelect={(node) => {
                    store.getState().select(node?.rootLayerId ?? null)
                    if (node) setPanel('layer')
                  }}
                  onCommitBox={(layerId, box) =>
                    store.getState().apply((current) => setLayerBox(current, format, layerId, box))
                  }
                  onEditText={() => setPanel('layer')}
                />
              </div>
              {scene.warnings.length > 0 && (
                <ul className="mx-auto mt-3 max-w-xl list-disc pl-5 text-xs text-charcoal-600">
                  {scene.warnings.slice(0, 5).map((warning, index) => (
                    <li key={index}>{warning.message}</li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="skeleton-shimmer mx-auto rounded-lg" style={{ width: displayWidth, aspectRatio: `${aspect}` }} />
          )}
        </div>

        <div className="min-w-0">
          <SegmentedControl<Panel>
            aria-label="Template panels"
            options={[
              { value: 'layer', label: 'Layer' },
              { value: 'slots', label: 'Slots' },
              { value: 'json', label: 'JSON' },
              { value: 'history', label: 'History' },
            ]}
            value={panel}
            onChange={(next) => {
              setPanel(next)
              if (next === 'json') setJson({ text: JSON.stringify(store.getState().definition, null, 2), error: null })
            }}
          />
          <div className="mt-5">
            {panel === 'layer' && (
              <div className="space-y-5">
                {selectedLayer ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => store.getState().apply((d) => moveLayer(d, format, selectedLayer.id, 1))}>
                        Bring forward
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => store.getState().apply((d) => moveLayer(d, format, selectedLayer.id, -1))}>
                        Send back
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const result = duplicateLayer(store.getState().definition, format, selectedLayer.id)
                          store.getState().replace(result.definition)
                          store.getState().select(result.id)
                        }}
                      >
                        Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          store.getState().apply((d) => removeLayer(d, format, selectedLayer.id))
                          store.getState().select(null)
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                    <LayerInspector
                      key={`${format}:${selectedLayer.id}`}
                      layer={selectedLayer}
                      definition={definition}
                      onChange={(recipe, group) =>
                        store.getState().apply((d) => updateLayer(d, format, selectedLayer.id, recipe), group)
                      }
                    />
                  </>
                ) : (
                  <p className="text-sm text-charcoal-500">Click a layer on the canvas or in the list to edit it. Drag to move.</p>
                )}
                <div className="flex flex-wrap gap-2 border-t border-champagne-200 pt-4">
                  {(['text', 'rect', 'line'] as const).map((kind) => (
                    <Button
                      key={kind}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const result = addLayer(store.getState().definition, format, kind)
                        store.getState().replace(result.definition)
                        store.getState().select(result.id)
                      }}
                    >
                      Add {kind === 'text' ? 'text' : kind === 'rect' ? 'rectangle' : 'rule'}
                    </Button>
                  ))}
                </div>
                <ul className="max-h-80 overflow-y-auto rounded-lg border border-champagne-200">
                  {[...(layout?.layers ?? [])].reverse().map((layer) => (
                    <li key={layer.id}>
                      <button
                        type="button"
                        aria-pressed={layer.id === selected}
                        onClick={() => store.getState().select(layer.id)}
                        className={`w-full px-3 py-1.5 text-left text-sm ${
                          layer.id === selected ? 'bg-ballet-pink-100 text-ballet-pink-800' : 'text-charcoal-700 hover:bg-champagne-100'
                        }`}
                      >
                        {layer.name ?? layer.id}
                        <span className="ml-2 text-xs text-charcoal-400">{layer.kind}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {panel === 'slots' && (
              <SlotsPanel
                definition={definition}
                onChange={(slotId, recipe, field) =>
                  store.getState().apply((d) => updateSlot(d, slotId, recipe), `slot:${slotId}:${field}`)
                }
              />
            )}
            {panel === 'json' && json && (
              <div className="space-y-3">
                <textarea
                  aria-label="Template definition JSON"
                  value={json.text}
                  onChange={(event) => setJson({ text: event.target.value, error: null })}
                  spellCheck={false}
                  rows={24}
                  className="w-full rounded-lg border border-champagne-200 bg-champagne-50 p-3 font-mono text-xs text-charcoal-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                {json.error && <p className="text-sm text-rose-700">{json.error}</p>}
                <Button variant="outline" onClick={applyJson}>
                  Apply JSON
                </Button>
              </div>
            )}
            {panel === 'history' && (
              <ul className="divide-y divide-champagne-200 rounded-lg border border-champagne-200">
                {data.versions.map((version) => (
                  <li key={version.id} className="px-3 py-2 text-sm">
                    <span className="font-medium text-charcoal-900">Version {version.version}</span>
                    <span className="ml-2 text-charcoal-500">{dateFormat.format(new Date(version.published_at))}</span>
                    {version.id && data.currentVersion === version.version && (
                      <span className="ml-2 text-xs text-gold-700">live</span>
                    )}
                    {version.notes && <p className="text-xs text-charcoal-500">{version.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmPublish}
        title="Publish this draft?"
        body={
          <div className="space-y-3">
            <p>New promos will use it. Saved promos keep the version they were made with, so their exports don’t change.</p>
            <textarea
              aria-label="What changed"
              placeholder="What changed (optional)"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="w-full rounded-lg border border-champagne-200 bg-champagne-50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        }
        confirmLabel={publishing ? 'Publishing…' : 'Publish'}
        busy={publishing}
        onConfirm={publish}
        onCancel={() => setConfirmPublish(false)}
      />
      <ConfirmDialog
        isOpen={confirmDiscard}
        title="Discard the draft?"
        body="Your unpublished changes go away. The live version stays as it is."
        confirmLabel="Discard"
        tone="destructive"
        onConfirm={discard}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  )
}
