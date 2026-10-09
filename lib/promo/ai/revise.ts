import { z } from 'zod'
import { getSlot, placementFor, resolveSlotValue, setSlotValue, valueAsText, type AssetForPlacement } from '../document'
import { SHOT_TYPE_LABELS } from '../tags'
import { PHOTO_LOOKS, type AssetTags, type BrandTokens, type DesignDocument, type PhotoLook, type SlotDef, type TemplateDefinition } from '../types'
import { copySlots, photoSlots } from './generate'
import { photoProblems, slotProblems, type CopyContext } from './validate'

/**
 * AI revisions: the model returns operations from an allowlist, never a
 * new document. Code checks each one, drops any that touch a slot she
 * edited by hand (unless her instruction names that slot), and applies the
 * rest. Facts and brand lines have no operations at all.
 */

export type ReviseOp =
  | { op: 'set_copy'; slot: string; value: string }
  | { op: 'set_list'; slot: string; items: string[] }
  | { op: 'assign_photo'; slot: string; index: number; photo: string }
  | { op: 'swap_photos'; a_slot: string; a_index: number; b_slot: string; b_index: number }
  | { op: 'set_photo_look'; slot: string; look: PhotoLook }
  | { op: 'set_variant'; variant: string }

export interface ReviseReply {
  summary: string
  ops: ReviseOp[]
}

function enumOf(values: string[]) {
  return z.enum(values as [string, ...string[]])
}

export function buildReviseSchema(definition: TemplateDefinition, photoIds: string[]) {
  const text = copySlots(definition).filter((slot) => slot.kind === 'text').map((slot) => slot.id)
  const lists = copySlots(definition).filter((slot) => slot.kind === 'list').map((slot) => slot.id)
  const photos = photoSlots(definition).map((slot) => slot.id)
  const options: z.ZodType[] = [
    z.object({ op: z.literal('set_variant'), variant: enumOf(Object.keys(definition.variants)) }),
  ]
  if (text.length) options.push(z.object({ op: z.literal('set_copy'), slot: enumOf(text), value: z.string() }))
  if (lists.length) options.push(z.object({ op: z.literal('set_list'), slot: enumOf(lists), items: z.array(z.string()) }))
  if (photos.length) {
    options.push(z.object({ op: z.literal('set_photo_look'), slot: enumOf(photos), look: z.enum(PHOTO_LOOKS) }))
    options.push(
      z.object({
        op: z.literal('swap_photos'),
        a_slot: enumOf(photos),
        a_index: z.number().int(),
        b_slot: enumOf(photos),
        b_index: z.number().int(),
      })
    )
    if (photoIds.length) {
      options.push(
        z.object({ op: z.literal('assign_photo'), slot: enumOf(photos), index: z.number().int(), photo: enumOf(photoIds) })
      )
    }
  }
  return z.object({
    summary: z.string().describe('One short sentence telling her what changed, or why nothing could.'),
    ops: z.array(z.union(options as [z.ZodType, z.ZodType, ...z.ZodType[]])),
  })
}

export const REVISE_INSTRUCTIONS = `You revise a class promo by returning operations, not a new design. Change only what her instruction asks for, plus what it clearly implies: "more dramatic" can mean the dark color variant and a dramatic photo look; "punchier" means shorter, stronger copy.

Rules for any copy you write:
- No exclamation points, emoji, hashtags or digits.
- Don't name months, weekdays, times of day or prices; dates and prices are shown separately.
- Keep within each field's limits.
- Fields marked LOCKED were written by her. Leave them alone unless her instruction names them.

If the request needs something these operations can't do, return no operations and say so in the summary.`

export interface ReviseContext {
  definition: TemplateDefinition
  brand: BrandTokens
  document: DesignDocument
  instruction: string
  /** Photos she can see in this promo: placed ones and the rest of her brief's picks. */
  photos: (AssetForPlacement & { tags?: AssetTags | null })[]
}

function slotLine(slot: SlotDef, document: DesignDocument, brand: BrandTokens): string {
  const value = resolveSlotValue(slot, document, brand)
  const limits =
    slot.kind === 'list'
      ? `${slot.list?.min ?? 0} to ${slot.list?.max ?? 6} items, each ${slot.maxChars ?? 30} characters or fewer`
      : `${slot.maxChars ?? 120} characters or fewer`
  const names = slot.aliases?.length ? `; also called ${slot.aliases.join(', ')}` : ''
  const locked = document.edited.includes(slot.id) ? ' LOCKED' : ''
  const shown = slot.kind === 'list' ? JSON.stringify(value ?? []) : JSON.stringify(valueAsText(value))
  return `- ${slot.id} (${slot.label}${names}; ${limits})${locked}: ${shown}`
}

export function reviseInput(context: ReviseContext): string {
  const { definition, document, brand } = context
  const tagsById = new Map(context.photos.map((photo) => [photo.id, photo.tags ?? {}]))
  const describe = (id: string) => {
    const tags = tagsById.get(id) ?? {}
    const shots = tags.shotTypes?.map((shot) => SHOT_TYPE_LABELS[shot].toLowerCase()).join(', ')
    return [shots, tags.description].filter(Boolean).join('; ') || 'no description'
  }
  const copy = copySlots(definition).map((slot) => slotLine(slot, document, brand)).join('\n')
  const facts = definition.slots
    .filter((slot) => slot.binding === 'fact')
    .map((slot) => `- ${slot.label}: ${valueAsText(resolveSlotValue(slot, document, brand)) || 'not set'}`)
    .join('\n')
  const placed = new Set<string>()
  const photoLines = photoSlots(definition)
    .flatMap((slot) =>
      (document.photos[slot.id] ?? []).map((placement, index) => {
        placed.add(placement.assetId)
        const locked = document.edited.includes(slot.id) ? ' LOCKED' : ''
        return `- ${slot.id}[${index}]${locked}: ${placement.assetId} (${describe(placement.assetId)}), look ${placement.look ?? 'natural'}`
      })
    )
    .join('\n')
  const spare = context.photos
    .filter((photo) => !placed.has(photo.id))
    .map((photo) => `- ${photo.id} (${describe(photo.id)})`)
    .join('\n')
  const variants = Object.entries(definition.variants)
    .map(([id, variant]) => `${id} (${variant.label})`)
    .join(', ')
  return `Her instruction: ${context.instruction}

Copy fields:
${copy}

Facts (can't change):
${facts}

Photos in the design:
${photoLines || '- none'}

Other photos she picked:
${spare || '- none'}

Color variants: ${variants}. Current: ${document.variant}.
Photo looks: ${PHOTO_LOOKS.join(', ')}.`
}

/** True when her instruction names the slot by label or alias, which unlocks a slot she edited. */
export function namesSlot(instruction: string, slot: SlotDef): boolean {
  const text = ` ${instruction.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')} `
  return [slot.label, ...(slot.aliases ?? [])].some((name) => {
    const words = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim()
    return words.length > 0 && text.includes(` ${words} `)
  })
}

export interface RevisionOutcome {
  document: DesignDocument
  applied: string[]
  skipped: { op: string; reason: string }[]
}

export function applyRevision(context: ReviseContext, ops: ReviseOp[], copy: CopyContext): RevisionOutcome {
  const { definition } = context
  let document = context.document
  const applied: string[] = []
  const skipped: { op: string; reason: string }[] = []
  const allowedPhotos = context.photos.map((photo) => photo.id)
  const photoById = new Map(context.photos.map((photo) => [photo.id, photo]))

  const lockedSlot = (slotId: string): SlotDef | null => {
    const slot = getSlot(definition, slotId)
    if (!slot) return null
    return document.edited.includes(slotId) && !namesSlot(context.instruction, slot) ? slot : null
  }
  const skip = (op: ReviseOp, reason: string) => skipped.push({ op: op.op, reason })
  const setPhotos = (slotId: string, placements: DesignDocument['photos'][string]) => {
    document = { ...document, photos: { ...document.photos, [slotId]: placements } }
  }

  for (const op of ops) {
    switch (op.op) {
      case 'set_variant': {
        if (!definition.variants[op.variant]) skip(op, 'Unknown color variant.')
        else if (op.variant !== document.variant) {
          document = { ...document, variant: op.variant }
          applied.push(`Switched to ${definition.variants[op.variant].label}`)
        }
        break
      }
      case 'set_copy':
      case 'set_list': {
        const slot = getSlot(definition, op.slot)
        if (!slot || slot.binding !== 'copy') {
          skip(op, 'That field isn’t copy.')
          break
        }
        const locked = lockedSlot(op.slot)
        if (locked) {
          skip(op, `${locked.label} keeps your wording. Name it in the request to change it.`)
          break
        }
        const value = op.op === 'set_copy' ? op.value.trim() : op.items.map((item) => item.trim()).filter(Boolean)
        const problems = slotProblems(slot, value, copy)
        if (problems.length) {
          skip(op, problems[0])
          break
        }
        document = setSlotValue(document, slot.id, value, { byHand: false })
        applied.push(`Rewrote ${slot.label.toLowerCase()}`)
        break
      }
      case 'assign_photo': {
        const slot = getSlot(definition, op.slot)
        const current = document.photos[op.slot] ?? []
        const max = slot?.kind === 'photos' ? (slot.list?.max ?? 4) : 1
        if (!slot || slot.binding !== 'photo' || op.index < 0 || op.index > current.length || op.index >= max) {
          skip(op, 'That photo spot doesn’t exist.')
          break
        }
        const locked = lockedSlot(op.slot)
        if (locked) {
          skip(op, `${locked.label} keeps the photo you chose.`)
          break
        }
        const others = current.filter((_, index) => index !== op.index).map((placement) => placement.assetId)
        const problems = photoProblems(slot.label, [op.photo], allowedPhotos, { max: 1, exclude: others })
        const asset = photoById.get(op.photo)
        if (problems.length || !asset) {
          skip(op, problems[0] ?? 'Unknown photo.')
          break
        }
        const next = [...current]
        next[op.index] = { ...placementFor(asset), look: current[op.index]?.look }
        setPhotos(slot.id, next)
        applied.push(`Changed a photo in ${slot.label.toLowerCase()}`)
        break
      }
      case 'swap_photos': {
        const a = document.photos[op.a_slot]?.[op.a_index]
        const b = document.photos[op.b_slot]?.[op.b_index]
        if (!a || !b || (op.a_slot === op.b_slot && op.a_index === op.b_index)) {
          skip(op, 'Those photos aren’t both in the design.')
          break
        }
        const locked = lockedSlot(op.a_slot) ?? lockedSlot(op.b_slot)
        if (locked) {
          skip(op, `${locked.label} keeps the photo you chose.`)
          break
        }
        const first = [...(document.photos[op.a_slot] ?? [])]
        first[op.a_index] = { ...b, look: a.look }
        setPhotos(op.a_slot, first)
        const second = [...(document.photos[op.b_slot] ?? [])]
        second[op.b_index] = { ...a, look: b.look }
        setPhotos(op.b_slot, second)
        applied.push('Swapped two photos')
        break
      }
      case 'set_photo_look': {
        const placements = document.photos[op.slot]
        if (!placements?.length) {
          skip(op, 'No photo there.')
          break
        }
        const locked = lockedSlot(op.slot)
        if (locked) {
          skip(op, `${locked.label} keeps the photo as you set it.`)
          break
        }
        const look = op.look === 'natural' ? undefined : op.look
        setPhotos(
          op.slot,
          placements.map((placement) => ({ ...placement, look }))
        )
        applied.push(`Set a ${op.look} look on ${getSlot(definition, op.slot)?.label.toLowerCase() ?? 'a photo'}`)
        break
      }
    }
  }
  return { document, applied, skipped }
}
