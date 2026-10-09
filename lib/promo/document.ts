import { formatSessions, levelPhrase } from './facts'
import { defaultFocus } from './layout/crop'
import type {
  AssetPose,
  AssetTags,
  BrandSource,
  BrandTokens,
  DesignDocument,
  PhotoPlacement,
  PromoBrief,
  SessionValue,
  SlotDef,
  SlotValue,
  TemplateDefinition,
} from './types'

export function emptyDocument(definition: TemplateDefinition): DesignDocument {
  return {
    v: 1,
    variant: definition.defaultVariant,
    values: {},
    photos: {},
    edited: [],
    nudges: {},
    layout: {},
  }
}

export function getSlot(definition: TemplateDefinition, slotId: string): SlotDef | undefined {
  return definition.slots.find((slot) => slot.id === slotId)
}

export function brandValue(source: BrandSource, brand: BrandTokens): string {
  return brand.identity[source] ?? ''
}

/** The value a slot shows: the design's own value, else the brand kit's for brand slots. */
export function resolveSlotValue(
  slot: SlotDef,
  document: DesignDocument,
  brand: BrandTokens
): SlotValue | undefined {
  if (Object.prototype.hasOwnProperty.call(document.values, slot.id)) {
    return document.values[slot.id]
  }
  if (slot.binding === 'brand' && slot.source) {
    return brandValue(slot.source as BrandSource, brand)
  }
  return undefined
}

export function isSessionList(value: SlotValue | undefined): value is SessionValue[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    'weekday' in (value[0] as object)
  )
}

export function isStringList(value: SlotValue | undefined): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** Text and list values as plain strings, for previews and the AI summary. */
export function valueAsText(value: SlotValue | undefined): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  if (isSessionList(value)) return value.map((s) => `${s.weekday} ${s.date} ${s.time}`).join('; ')
  return (value as string[]).join(' | ')
}

/** Fact slot values from the brief. Code writes these; the model never does. */
export function factValues(
  definition: TemplateDefinition,
  brief: Pick<PromoBrief, 'sessions' | 'level' | 'levelText' | 'location' | 'price'>
): Record<string, SlotValue> {
  const values: Record<string, SlotValue> = {}
  for (const slot of definition.slots) {
    if (slot.binding !== 'fact') continue
    switch (slot.source) {
      case 'sessions':
        values[slot.id] = formatSessions(brief.sessions).slice(0, slot.list?.max ?? 4)
        break
      case 'level':
        values[slot.id] = levelPhrase(brief.level, brief.levelText)
        break
      case 'location':
        values[slot.id] = brief.location.trim()
        break
      case 'price':
        values[slot.id] = brief.price.trim()
        break
    }
  }
  return values
}

/** Reference content for template previews and the template editor. */
export function exampleDocument(definition: TemplateDefinition): DesignDocument {
  const document = emptyDocument(definition)
  for (const slot of definition.slots) {
    if (slot.example !== undefined && slot.binding !== 'photo') {
      document.values[slot.id] = slot.example
    }
  }
  return document
}

export interface AssetForPlacement {
  id: string
  pose?: AssetPose | null
  tags?: AssetTags | null
}

export function placementFor(asset: AssetForPlacement): PhotoPlacement {
  return { assetId: asset.id, ...defaultFocus(asset.pose, asset.tags), zoom: 1 }
}

/** Sets a slot value and, when the change is hers, locks the slot against AI revisions. */
export function setSlotValue(
  document: DesignDocument,
  slotId: string,
  value: SlotValue,
  options: { byHand: boolean }
): DesignDocument {
  const edited =
    options.byHand && !document.edited.includes(slotId) ? [...document.edited, slotId] : document.edited
  return { ...document, values: { ...document.values, [slotId]: value }, edited }
}

export function setSlotPhotos(
  document: DesignDocument,
  slotId: string,
  placements: PhotoPlacement[],
  options: { byHand: boolean }
): DesignDocument {
  const edited =
    options.byHand && !document.edited.includes(slotId) ? [...document.edited, slotId] : document.edited
  return { ...document, photos: { ...document.photos, [slotId]: placements }, edited }
}

/** Every asset id the document shows, for prefetching. */
export function documentAssetIds(document: DesignDocument): string[] {
  const ids = new Set<string>()
  for (const placements of Object.values(document.photos)) {
    for (const placement of placements) ids.add(placement.assetId)
  }
  return [...ids]
}

/**
 * Copies a design into another format of the same template: values, photos,
 * variant and her edit locks carry over; nudges and frozen layout belong to
 * the old canvas and don't.
 */
export function documentForSibling(document: DesignDocument): DesignDocument {
  return {
    v: 1,
    variant: document.variant,
    values: { ...document.values },
    photos: Object.fromEntries(
      Object.entries(document.photos).map(([slot, placements]) => [slot, placements.map((p) => ({ ...p }))])
    ),
    edited: [...document.edited],
    nudges: {},
    layout: {},
  }
}

/**
 * Keeps the document consistent with a template: drops values and photos for
 * slots the template no longer has, and fills a missing variant.
 */
export function normalizeDocument(document: DesignDocument, definition: TemplateDefinition): DesignDocument {
  const slotIds = new Set(definition.slots.map((slot) => slot.id))
  return {
    ...document,
    variant: definition.variants[document.variant] ? document.variant : definition.defaultVariant,
    values: Object.fromEntries(Object.entries(document.values).filter(([id]) => slotIds.has(id))),
    photos: Object.fromEntries(Object.entries(document.photos).filter(([id]) => slotIds.has(id))),
    edited: document.edited.filter((id) => slotIds.has(id)),
  }
}
