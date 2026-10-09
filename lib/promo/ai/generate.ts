import { z } from 'zod'
import { emptyDocument, getSlot, placementFor, valueAsText, type AssetForPlacement } from '../document'
import { formatSession, levelPhrase, sortSessions } from '../facts'
import { SHOT_TYPE_LABELS, slotFitScore } from '../tags'
import type {
  AssetTags,
  BrandTokens,
  DesignDocument,
  PromoBrief,
  SlotDef,
  SlotValue,
  TemplateDefinition,
} from '../types'
import { photoProblems, slotProblems, type CopyContext } from './validate'

/**
 * AI fill for a new promo. The model writes the copy slots and picks photos
 * from her selection by id; code writes every fact. Three calls run with
 * different angles so the picker offers real alternatives.
 */

export const ANGLES = [
  {
    id: 'technique',
    label: 'Technique first',
    direction: 'Lead with precision and technique: clean lines, control, placement, details that separate good from excellent.',
  },
  {
    id: 'performance',
    label: 'Performance first',
    direction: 'Lead with performance quality: stage presence, musicality, confidence, dancing full out.',
  },
  {
    id: 'strength',
    label: 'Strength first',
    direction: 'Lead with strength and conditioning: power, stamina, flexibility built safely, kicks that last a whole number.',
  },
] as const

export type AngleId = (typeof ANGLES)[number]['id']

export interface GenerationPhoto extends AssetForPlacement {
  width: number
  height: number
  tags?: AssetTags | null
}

export function copySlots(definition: TemplateDefinition): SlotDef[] {
  return definition.slots.filter((slot) => slot.binding === 'copy' && (slot.kind === 'text' || slot.kind === 'list'))
}

export function photoSlots(definition: TemplateDefinition): SlotDef[] {
  return definition.slots.filter((slot) => slot.binding === 'photo')
}

function limitsText(slot: SlotDef): string {
  if (slot.kind === 'list') {
    const { min = 0, max = 6, target } = slot.list ?? {}
    const count = target ? `${target} items (${min} to ${max})` : `${min} to ${max} items`
    return `${count}, each ${slot.maxChars ?? 30} characters or fewer`
  }
  return `${slot.maxChars ?? 120} characters or fewer`
}

/** Strict output schema built from the template's slots; photo fields only accept her selected ids. */
export function buildVariationSchema(definition: TemplateDefinition, photoIds: string[]) {
  const copy: Record<string, z.ZodType> = {}
  for (const slot of copySlots(definition)) {
    const description = `${slot.label}. ${slot.guidance ?? ''} ${limitsText(slot)}.`.replace(/\s+/g, ' ').trim()
    copy[slot.id] = slot.kind === 'list' ? z.array(z.string()).describe(description) : z.string().describe(description)
  }
  const photo = z.enum(photoIds as [string, ...string[]])
  const photos: Record<string, z.ZodType> = {}
  for (const slot of photoSlots(definition)) {
    photos[slot.id] =
      slot.kind === 'photos'
        ? z.array(photo).describe(`${slot.label}: up to ${slot.list?.max ?? 4} photo ids, none repeated, not the hero.`)
        : photo.describe(`${slot.label}: one photo id.`)
  }
  const variants = Object.keys(definition.variants) as [string, ...string[]]
  return z.object({
    copy: z.object(copy),
    photos: z.object(photos),
    variant: z.enum(variants).describe(
      Object.entries(definition.variants)
        .map(([id, variant]) => `${id}: ${variant.label}`)
        .join('; ')
    ),
  })
}

export type Variation = {
  copy: Record<string, string | string[]>
  photos: Record<string, string | string[]>
  variant: string
}

export function instructionsFor(brand: BrandTokens, angle: (typeof ANGLES)[number], sessionCount: number): string {
  const banned = brand.voice.bannedWords.length ? brand.voice.bannedWords.join(', ') : 'none'
  return `You write the words for a promo graphic advertising a class taught by ${brand.identity.name}, a professional dancer and teacher. A design tool places your words in a fixed template. Dates, times, location, price and level are filled in separately from the class schedule, so you never write them.

Voice: ${brand.voice.notes}
Never use these words: ${banned}.

Rules:
- No exclamation points, emoji, hashtags or digits.
- Don't name months, weekdays, times of day or prices.
- The class has ${sessionCount} ${sessionCount === 1 ? 'date' : 'dates'}. Only mention how many days or sessions if your number is exactly ${sessionCount}; otherwise leave the count out.
- Keep every field within its limit; shorter reads better on a poster.
- Write the title as two short lines: an idea word, then the format word in gold.
- Choose photos by their descriptions. The hero is the most striking full-body or dramatic shot; the strip gets the others, best first.

Angle for this version: ${angle.direction}`
}

function sessionLines(brief: Pick<PromoBrief, 'sessions'>): string {
  const sessions = sortSessions(brief.sessions).map(formatSession)
  if (sessions.length === 0) return 'not set yet'
  return sessions.map((s) => `${s.weekday} ${s.date}, ${s.time}`).join('; ')
}

function photoLine(photo: GenerationPhoto): string {
  const tags = photo.tags ?? {}
  const parts = [
    tags.orientation ?? (photo.width >= photo.height ? 'landscape' : 'portrait'),
    tags.shotTypes?.length ? tags.shotTypes.map((shot) => SHOT_TYPE_LABELS[shot].toLowerCase()).join(', ') : null,
    tags.description ?? null,
    tags.mood ? `mood: ${tags.mood}` : null,
  ].filter(Boolean)
  return `- ${photo.id}: ${parts.join('; ')}`
}

export function inputFor(
  definition: TemplateDefinition,
  brief: PromoBrief,
  photos: GenerationPhoto[]
): string {
  const fields = copySlots(definition)
    .map((slot) => `- ${slot.id}: ${slot.label}. ${slot.guidance ?? ''} ${limitsText(slot)}.`.replace(/\s+/g, ' '))
    .join('\n')
  return `Class type: ${brief.classType || 'class'}
Title idea: ${brief.titleIdea || 'none, suggest one'}
What it covers: ${brief.focusPoints || 'not given'}
Vibe notes: ${brief.vibe || 'none'}
Level (shown separately): ${levelPhrase(brief.level, brief.levelText) || 'not set'}
Schedule (shown separately): ${sessionLines(brief)}
Location (shown separately): ${brief.location || 'not set'}

Fields to write:
${fields}

Photos she picked:
${photos.map(photoLine).join('\n')}`
}

/** Everything wrong with a variation, as instructions for the retry. Empty when it can be used. */
export function variationProblems(
  definition: TemplateDefinition,
  variation: Variation,
  photoIds: string[],
  context: CopyContext
): string[] {
  const problems: string[] = []
  for (const slot of copySlots(definition)) {
    const value = variation.copy[slot.id]
    if (value === undefined) {
      problems.push(`${slot.label}: missing.`)
      continue
    }
    problems.push(...slotProblems(slot, value, context))
  }
  const hero = photoSlots(definition).find((slot) => slot.kind === 'photo')
  const heroId = hero ? variation.photos[hero.id] : undefined
  for (const slot of photoSlots(definition)) {
    const value = variation.photos[slot.id]
    const ids = Array.isArray(value) ? value : value ? [value] : []
    problems.push(
      ...photoProblems(slot.label, ids, photoIds, {
        max: slot.kind === 'photos' ? (slot.list?.max ?? 4) : 1,
        exclude: slot.kind === 'photos' && typeof heroId === 'string' ? [heroId] : [],
      })
    )
  }
  if (!definition.variants[variation.variant]) problems.push(`variant: choose one of ${Object.keys(definition.variants).join(', ')}.`)
  return problems
}

function cleanValue(value: string | string[]): SlotValue {
  return Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean) : value.trim()
}

/** A design document from a checked variation, with the facts written by code. */
export function documentFromVariation(
  definition: TemplateDefinition,
  facts: Record<string, SlotValue>,
  variation: Variation,
  photos: GenerationPhoto[]
): DesignDocument {
  const byId = new Map(photos.map((photo) => [photo.id, photo]))
  const document = emptyDocument(definition)
  document.variant = definition.variants[variation.variant] ? variation.variant : definition.defaultVariant
  document.values = { ...facts }
  for (const slot of copySlots(definition)) {
    const value = variation.copy[slot.id]
    if (value !== undefined) document.values[slot.id] = cleanValue(value)
  }
  for (const slot of photoSlots(definition)) {
    const value = variation.photos[slot.id]
    const ids = Array.isArray(value) ? value : value ? [value] : []
    document.photos[slot.id] = ids
      .map((id) => byId.get(id))
      .filter((photo): photo is GenerationPhoto => Boolean(photo))
      .slice(0, slot.kind === 'photos' ? (slot.list?.max ?? 4) : 1)
      .map((photo) => placementFor(photo))
  }
  return document
}

/** Splits "Turns and Leaps Clinic" into two balanced title lines. */
export function splitTitle(idea: string): [string, string] {
  const words = idea.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['', '']
  if (words.length === 1) return [words[0], '']
  let best = 1
  let bestDiff = Infinity
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length)
    if (diff < bestDiff) {
      best = i
      bestDiff = diff
    }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')]
}

/**
 * The facts-only starting point when AI is off, capped or failing: her
 * title idea, her focus points as keywords, template wording that passes
 * the fact guard, and her photos in their best-fitting slots. The editor
 * never opens blank.
 */
export function fallbackDocument(
  definition: TemplateDefinition,
  brief: PromoBrief,
  facts: Record<string, SlotValue>,
  photos: GenerationPhoto[],
  context: CopyContext
): DesignDocument {
  const document = emptyDocument(definition)
  document.values = { ...facts }
  const [first, second] = splitTitle(brief.titleIdea || brief.classType || '')
  for (const slot of copySlots(definition)) {
    if (slot.id === 'title_primary' && first) {
      document.values[slot.id] = first
      continue
    }
    if (slot.id === 'title_accent' && (second || brief.classType)) {
      document.values[slot.id] = second || brief.classType
      continue
    }
    if (slot.kind === 'list' && slot.id === 'keywords' && brief.focusPoints.trim()) {
      const words = brief.focusPoints
        .split(/[,\n;]+/)
        .map((item) => item.trim())
        .filter((item) => item && item.length <= (slot.maxChars ?? 30))
        .slice(0, slot.list?.max ?? 6)
      if (words.length >= (slot.list?.min ?? 0)) {
        document.values[slot.id] = words
        continue
      }
    }
    if (slot.example !== undefined && slotProblems(slot, slot.example as string | string[], context).length === 0) {
      document.values[slot.id] = slot.example
    }
  }

  const hero = photoSlots(definition).find((slot) => slot.kind === 'photo')
  const strip = photoSlots(definition).find((slot) => slot.kind === 'photos')
  const ranked = [...photos].sort(
    (a, b) =>
      slotFitScore(b.tags, hero?.preferredShots, true) - slotFitScore(a.tags, hero?.preferredShots, true)
  )
  if (hero && ranked[0]) document.photos[hero.id] = [placementFor(ranked[0])]
  if (strip) {
    document.photos[strip.id] = ranked
      .slice(hero ? 1 : 0)
      .slice(0, strip.list?.max ?? 4)
      .map((photo) => placementFor(photo))
  }
  return document
}

/** One line for the picker card: the title and tagline the variation chose. */
export function variationSummary(definition: TemplateDefinition, document: DesignDocument): string {
  const title = ['title_primary', 'title_accent']
    .map((id) => (getSlot(definition, id) ? valueAsText(document.values[id]) : ''))
    .filter(Boolean)
    .join(' ')
  const tagline = valueAsText(document.values.tagline)
  return [title, tagline].filter(Boolean).join(' · ')
}
