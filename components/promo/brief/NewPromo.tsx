'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PhotoIcon, PlusIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Button, Input, PageHeader, SegmentedControl, Select, Textarea, useToast } from '@/components/ui'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { fallbackDocument } from '@/lib/promo/ai/generate'
import { loadFontsForLayout } from '@/lib/promo/client/fonts'
import { loadAssetImage } from '@/lib/promo/client/images'
import { factValues } from '@/lib/promo/document'
import { LEVEL_OPTIONS, locationFromClass, priceFromClass, sessionsFromClasses, sharedClassTitle } from '@/lib/promo/facts'
import { FORMAT_SPECS } from '@/lib/promo/formats'
import type {
  BrandTokens,
  DesignDocument,
  LevelKey,
  PromoAsset,
  PromoBrief,
  PromoFormat,
  SessionInput,
  TemplateDefinition,
} from '@/lib/promo/types'
import { promoFetch } from '../hooks'
import { AssetThumb } from '../library/AssetThumb'
import { PhotoPickerSheet } from '../library/PhotoPickerSheet'
import { ClassPicker, type PickableClass } from './ClassPicker'
import { useGenerate } from './useGenerate'
import { VariationCard } from './VariationCard'

interface TemplatesResponse {
  templates: { id: string; slug: string; name: string; versionId: string; definition: TemplateDefinition }[]
  brand: BrandTokens
}

const CLASS_TYPE_LABELS: Record<string, string> = {
  group: 'Class',
  workshop: 'Workshop',
  master_class: 'Master Class',
  competition_choreography: 'Competition Choreography',
}

const DRAFT_KEY = 'cpf-promo-brief'

const MAX_PHOTOS = 5

const emptyBrief: PromoBrief = {
  format: 'ig_post',
  classIds: [],
  photoIds: [],
  classType: '',
  titleIdea: '',
  focusPoints: '',
  level: 'all',
  levelText: '',
  price: '',
  location: '',
  vibe: '',
  sessions: [],
}

function readDraft(): PromoBrief {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY)
    return raw ? { ...emptyBrief, ...(JSON.parse(raw) as Partial<PromoBrief>), photoIds: [] } : emptyBrief
  } catch {
    return emptyBrief
  }
}

/**
 * The brief: format, class, 1 to 5 photos, a few details, then three AI
 * versions to pick from. Fonts and photos load while she types, so the
 * cards draw as soon as the model answers.
 */
export default function NewPromo() {
  const router = useRouter()
  const { addToast } = useToast()
  const [brief, setBrief] = useState<PromoBrief>(() => readDraft())
  const [photos, setPhotos] = useState<PromoAsset[]>([])
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({})
  const [fontsReady, setFontsReady] = useState(false)
  // The title idea follows the picked classes until she types her own.
  const [autoTitle, setAutoTitle] = useState('')
  const { state, run, reset } = useGenerate()
  const results = useRef<HTMLDivElement>(null)

  const templates = useAsyncData<TemplatesResponse>(
    (signal) => promoFetch<TemplatesResponse>('/api/promo/templates', { signal }),
    []
  )
  const template = templates.data?.templates[0]
  const brand = templates.data?.brand
  const definition = template?.definition
  const showsPrice = definition?.slots.some((slot) => slot.binding === 'fact' && slot.source === 'price') ?? false
  const maxSessions = definition?.slots.find((slot) => slot.kind === 'sessions')?.list?.max ?? 4

  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(brief))
    } catch {
      // Private browsing: the draft just isn't kept.
    }
  }, [brief])

  useEffect(() => {
    const layout = definition?.formats[brief.format]
    if (!layout || !brand) return
    let cancelled = false
    loadFontsForLayout(layout, brand)
      .then(() => {
        if (!cancelled) setFontsReady(true)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [definition, brief.format, brand])

  // Prefetch the screen-size copies of her picks while she fills in the rest.
  useEffect(() => {
    let cancelled = false
    Promise.all(
      photos.map((asset) =>
        loadAssetImage(asset, 'display')
          .then((image) => [asset.id, image] as const)
          .catch(() => null)
      )
    ).then((loaded) => {
      if (cancelled) return
      setImages(Object.fromEntries(loaded.filter((entry): entry is readonly [string, HTMLImageElement] => entry !== null)))
    })
    return () => {
      cancelled = true
    }
  }, [photos])

  const dims = useMemo(
    () => Object.fromEntries(photos.map((asset) => [asset.id, { width: asset.width, height: asset.height }])),
    [photos]
  )

  const update = (changes: Partial<PromoBrief>) => setBrief((current) => ({ ...current, ...changes }))

  const pickClasses = (classes: PickableClass[]) => {
    const first = classes[0]
    const title = sharedClassTitle(classes.map((cls) => cls.title))
    setAutoTitle(title)
    setBrief((current) => ({
      ...current,
      classIds: classes.map((cls) => cls.id),
      sessions: classes.length ? sessionsFromClasses(classes).slice(0, maxSessions) : current.sessions,
      titleIdea: !current.titleIdea || current.titleIdea === autoTitle ? title : current.titleIdea,
      location: current.location || (first ? locationFromClass(first) : ''),
      price: current.price || (first ? priceFromClass(first) : ''),
      classType: current.classType || (first ? (CLASS_TYPE_LABELS[first.class_type] ?? '') : ''),
    }))
  }

  const togglePhoto = (asset: PromoAsset) =>
    setPhotos((current) =>
      current.some((item) => item.id === asset.id)
        ? current.filter((item) => item.id !== asset.id)
        : current.length >= MAX_PHOTOS
          ? current
          : [...current, asset]
    )

  // Rows she added but didn't finish are left out rather than failing the request.
  const fullBrief = (): PromoBrief => ({
    ...brief,
    photoIds: photos.map((asset) => asset.id),
    sessions: brief.sessions.filter(
      (session) => /^\d{4}-\d{2}-\d{2}$/.test(session.date) && /^\d{1,2}:\d{2}$/.test(session.start) && /^\d{1,2}:\d{2}$/.test(session.end)
    ),
  })

  const generate = () => {
    void run(fullBrief())
    requestAnimationFrame(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const create = async (document: DesignDocument, source: 'generate' | 'manual', aiCallId?: string | null) => {
    if (!template) return
    setCreating(true)
    try {
      const { design } = await promoFetch<{ design: { id: string } }>('/api/promo/designs', {
        method: 'POST',
        json: {
          format: brief.format,
          templateVersionId: template.versionId,
          classIds: brief.classIds,
          brief: fullBrief(),
          document,
          source,
          aiCallId: aiCallId ?? null,
        },
      })
      try {
        window.sessionStorage.removeItem(DRAFT_KEY)
      } catch {
        // Nothing to clear.
      }
      router.push(`/instructor/promo/${design.id}`)
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Couldn’t create the promo. Try again.', 'error')
      setCreating(false)
    }
  }

  const startWithoutAi = () => {
    if (!definition || !brand) return
    const current = fullBrief()
    const document = fallbackDocument(definition, current, factValues(definition, current), photos, {
      bannedWords: brand.voice.bannedWords,
      sessionCount: current.sessions.length,
    })
    void create(document, 'manual')
  }

  const setSession = (index: number, changes: Partial<SessionInput>) =>
    update({ sessions: brief.sessions.map((session, i) => (i === index ? { ...session, ...changes } : session)) })

  const cardWidth = brief.format === 'ig_post' ? 300 : 260
  const running = state.phase === 'running'
  const variations = state.phase === 'running' || state.phase === 'done' ? state.variations : []

  return (
    <>
      <Link href="/instructor/promo" className="text-sm text-charcoal-500 hover:text-rose-700">
        ← Promo Studio
      </Link>
      <div className="mt-2">
        <PageHeader title="New promo" subtitle="Pick the class and your photos. AI writes three versions; you choose and edit." />
      </div>

      <div className="mt-header-gap grid gap-10 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
        <div className="space-y-8">
          <section aria-labelledby="brief-format">
            <h2 id="brief-format" className="font-serif text-xl font-semibold text-charcoal-950">
              Format
            </h2>
            <div className="mt-3">
              <SegmentedControl<PromoFormat>
                aria-label="Format"
                options={(['ig_post', 'ig_story', 'poster'] as const).map((format) => ({
                  value: format,
                  label: FORMAT_SPECS[format].shortLabel,
                }))}
                value={brief.format}
                onChange={(format) => update({ format })}
              />
            </div>
            <p className="mt-2 text-xs text-charcoal-500">
              {FORMAT_SPECS[brief.format].label}. You can make the other formats from the editor.
            </p>
          </section>

          <section aria-labelledby="brief-class">
            <h2 id="brief-class" className="font-serif text-xl font-semibold text-charcoal-950">
              Class
            </h2>
            <p className="mt-0.5 text-xs text-charcoal-500">
              Pick each day of a multi-day workshop. Dates, times and place come from the schedule.
            </p>
            <div className="mt-3">
              <ClassPicker selectedIds={brief.classIds} onChange={pickClasses} />
            </div>
          </section>

          <section aria-labelledby="brief-photos">
            <h2 id="brief-photos" className="font-serif text-xl font-semibold text-charcoal-950">
              Photos
            </h2>
            <p className="mt-0.5 text-xs text-charcoal-500">One to five. The AI chooses which goes where; you can swap them later.</p>
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {photos.map((asset, index) => (
                <li key={asset.id} className="relative">
                  <AssetThumb asset={asset} className="aspect-[4/5] w-full rounded-lg" sizes="120px" />
                  <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-charcoal-900/70 text-xs font-semibold text-champagne-50 tabular-nums">
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePhoto(asset)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-champagne-50/90 text-charcoal-700 hover:text-charcoal-950"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {photos.length < MAX_PHOTOS && (
                <li>
                  <button
                    type="button"
                    onClick={() => setPicking(true)}
                    className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-champagne-300 text-sm text-charcoal-600 transition-colors hover:bg-champagne-100"
                  >
                    {photos.length === 0 ? <PhotoIcon className="h-6 w-6" /> : <PlusIcon className="h-5 w-5" />}
                    {photos.length === 0 ? 'Choose photos' : 'Add'}
                  </button>
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby="brief-details" className="space-y-4">
            <h2 id="brief-details" className="font-serif text-xl font-semibold text-charcoal-950">
              Details
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title idea"
                name="titleIdea"
                placeholder="Precision Workshop"
                value={brief.titleIdea}
                maxLength={120}
                onChange={(event) => update({ titleIdea: event.target.value })}
              />
              <Input
                label="Kind of class"
                name="classType"
                placeholder="Workshop"
                value={brief.classType}
                maxLength={60}
                onChange={(event) => update({ classType: event.target.value })}
              />
            </div>
            <Textarea
              label="What it covers"
              name="focusPoints"
              placeholder="Kicks, turns, clean lines, stamina"
              rows={3}
              maxLength={600}
              value={brief.focusPoints}
              onChange={(event) => update({ focusPoints: event.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Level"
                name="level"
                value={brief.level}
                onChange={(event) => update({ level: event.target.value as LevelKey })}
                options={LEVEL_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
              {brief.level === 'custom' && (
                <Input
                  label="Level wording"
                  name="levelText"
                  placeholder="Ages 12 and up"
                  value={brief.levelText}
                  maxLength={60}
                  onChange={(event) => update({ levelText: event.target.value })}
                />
              )}
            </div>

            <fieldset>
              <legend className="mb-1 text-sm font-medium text-charcoal-500">Dates and times</legend>
              <div className="space-y-2">
                {brief.sessions.map((session, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]"
                  >
                    <input
                      type="date"
                      aria-label={`Date ${index + 1}`}
                      value={session.date}
                      onChange={(event) => setSession(index, { date: event.target.value })}
                      className="col-span-3 min-h-control w-full rounded-lg sm:col-span-1 border border-champagne-200 bg-champagne-50 px-3 text-charcoal-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <input
                      type="time"
                      aria-label={`Start time ${index + 1}`}
                      value={session.start}
                      onChange={(event) => setSession(index, { start: event.target.value })}
                      className="min-h-control w-full rounded-lg border border-champagne-200 bg-champagne-50 px-2 text-charcoal-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <input
                      type="time"
                      aria-label={`End time ${index + 1}`}
                      value={session.end}
                      onChange={(event) => setSession(index, { end: event.target.value })}
                      className="min-h-control w-full rounded-lg border border-champagne-200 bg-champagne-50 px-2 text-charcoal-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      aria-label={`Remove date ${index + 1}`}
                      onClick={() => update({ sessions: brief.sessions.filter((_, i) => i !== index) })}
                      className="inline-flex h-control w-control items-center justify-center rounded-md text-charcoal-500 hover:bg-champagne-100 hover:text-charcoal-900"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              {brief.sessions.length < maxSessions && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => update({ sessions: [...brief.sessions, { date: '', start: '18:00', end: '19:30' }] })}
                >
                  <PlusIcon className="mr-1 h-4 w-4" aria-hidden="true" />
                  Add a date
                </Button>
              )}
            </fieldset>

            <div className={`grid gap-4 ${showsPrice ? 'sm:grid-cols-2' : ''}`}>
              <Input
                label="Location"
                name="location"
                placeholder="Studio name, city"
                value={brief.location}
                maxLength={120}
                onChange={(event) => update({ location: event.target.value })}
              />
              {showsPrice && (
                <Input
                  label="Price"
                  name="price"
                  placeholder="$120"
                  value={brief.price}
                  maxLength={60}
                  onChange={(event) => update({ price: event.target.value })}
                />
              )}
            </div>
            <Textarea
              label="Anything about the tone"
              name="vibe"
              placeholder="Serious and focused, for competition teams"
              rows={2}
              maxLength={600}
              value={brief.vibe}
              onChange={(event) => update({ vibe: event.target.value })}
            />
          </section>

          <div className="flex flex-wrap items-center gap-3 border-t border-champagne-200 pt-6">
            <Button onClick={generate} disabled={photos.length === 0 || running || creating || !template}>
              <SparklesIcon className="mr-1.5 h-5 w-5" aria-hidden="true" />
              {running ? 'Writing…' : state.phase === 'done' ? 'Write three more' : 'Write three versions'}
            </Button>
            <Button variant="ghost" onClick={startWithoutAi} disabled={creating || !template || photos.length === 0}>
              Start without AI
            </Button>
            {photos.length === 0 && <p className="w-full text-xs text-charcoal-500">Choose at least one photo first.</p>}
          </div>
        </div>

        <div ref={results} className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start" aria-live="polite">
          {state.phase === 'idle' && (
            <div className="hidden rounded-lg border border-dashed border-champagne-300 px-6 py-16 text-center lg:block">
              <p className="font-serif text-xl text-charcoal-700">Your three versions show up here.</p>
              <p className="mt-2 text-sm text-charcoal-500">Each takes a different angle: technique, performance, strength.</p>
            </div>
          )}
          {state.phase === 'error' && (
            <div className="rounded-lg bg-ballet-pink-100 px-4 py-4 text-sm text-ballet-pink-900">
              <p>{state.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.code !== 'monthly_cap' && (
                  <Button size="sm" variant="outline" onClick={generate}>
                    Try again
                  </Button>
                )}
                <Button size="sm" onClick={startWithoutAi} disabled={creating}>
                  Start with your details
                </Button>
              </div>
            </div>
          )}
          {(state.phase === 'running' || state.phase === 'done') && definition && brand && (
            <>
              {state.phase === 'done' && state.variations.length === 0 && (
                <div className="mb-4 rounded-lg bg-ballet-pink-100 px-4 py-4 text-sm text-ballet-pink-900">
                  <p>{state.message ?? 'The AI didn’t return anything usable.'}</p>
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => (state.fallback ? void create(state.fallback, 'manual') : startWithoutAi())}
                    disabled={creating}
                  >
                    Start with your details
                  </Button>
                </div>
              )}
              <ul className="grid gap-4 sm:grid-cols-2">
                {variations.map((variation) =>
                  fontsReady ? (
                    <VariationCard
                      key={`${variation.index}:${variation.callId}`}
                      label={variation.label}
                      definition={definition}
                      format={brief.format}
                      document={variation.document}
                      brand={brand}
                      dims={dims}
                      images={images}
                      width={cardWidth}
                      busy={creating}
                      onUse={() => void create(variation.document, 'generate', variation.callId)}
                    />
                  ) : null
                )}
                {running &&
                  Array.from({ length: Math.max(0, 3 - variations.length) }, (_, index) => (
                    <li key={`pending-${index}`} className="rounded-lg border border-champagne-200 bg-champagne-50 p-3">
                      <div
                        className="skeleton-shimmer mx-auto rounded"
                        style={{
                          width: cardWidth,
                          aspectRatio: `${FORMAT_SPECS[brief.format].width} / ${FORMAT_SPECS[brief.format].height}`,
                        }}
                      />
                      <p className="mt-3 text-sm text-charcoal-500">Writing…</p>
                    </li>
                  ))}
              </ul>
              {state.phase === 'done' && state.variations.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-4" onClick={reset}>
                  Clear these
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <PhotoPickerSheet
        isOpen={picking}
        title="Choose photos"
        onClose={() => setPicking(false)}
        selectedIds={photos.map((asset) => asset.id)}
        onToggle={togglePhoto}
        max={MAX_PHOTOS}
      />
    </>
  )
}
