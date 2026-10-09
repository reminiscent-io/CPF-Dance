import { getSlot, isSessionList, isStringList, resolveSlotValue, setSlotValue } from '@/lib/promo/document'
import type { SceneText } from '@/lib/promo/layout/scene'
import type { BrandTokens, DesignDocument, SessionValue, SlotDef, TemplateDefinition } from '@/lib/promo/types'

/** What a double-click on canvas text edits: a whole text slot, one list item, or one part of a date. */
export type TextEditTarget =
  | { kind: 'value'; slot: SlotDef }
  | { kind: 'item'; slot: SlotDef; index: number }
  | { kind: 'session'; slot: SlotDef; index: number; field: keyof SessionValue }

/** Index into the stored list for the n-th item the canvas shows (blank items aren't drawn). */
function rawIndex(list: string[], shown: number): number {
  let seen = -1
  for (let i = 0; i < list.length; i++) {
    if (list[i].trim()) seen++
    if (seen === shown) return i
  }
  return -1
}

export function textEditTarget(node: SceneText, definition: TemplateDefinition): TextEditTarget | null {
  if (!node.slotId) return null
  const slot = getSlot(definition, node.slotId)
  if (!slot) return null
  if (slot.kind === 'text' && node.itemIndex === undefined) return { kind: 'value', slot }
  if (slot.kind === 'list' && node.field === 'item' && node.itemIndex !== undefined) {
    return { kind: 'item', slot, index: node.itemIndex }
  }
  if (slot.kind === 'sessions' && node.itemIndex !== undefined && node.field && node.field !== 'item') {
    return { kind: 'session', slot, index: node.itemIndex, field: node.field }
  }
  return null
}

export function readTarget(target: TextEditTarget, document: DesignDocument, brand: BrandTokens): string {
  const value = resolveSlotValue(target.slot, document, brand)
  if (target.kind === 'value') return typeof value === 'string' ? value : ''
  if (target.kind === 'item') {
    const list = isStringList(value) ? value : []
    const index = rawIndex(list, target.index)
    return index === -1 ? '' : list[index]
  }
  const sessions = isSessionList(value) ? value : []
  return sessions[target.index]?.[target.field] ?? ''
}

export function writeTarget(
  target: TextEditTarget,
  document: DesignDocument,
  brand: BrandTokens,
  text: string
): DesignDocument {
  const value = resolveSlotValue(target.slot, document, brand)
  if (target.kind === 'value') return setSlotValue(document, target.slot.id, text, { byHand: true })
  if (target.kind === 'item') {
    const list = isStringList(value) ? [...value] : []
    const index = rawIndex(list, target.index)
    if (index === -1) return document
    list[index] = text
    return setSlotValue(document, target.slot.id, list, { byHand: true })
  }
  const sessions = isSessionList(value) ? value.map((session) => ({ ...session })) : []
  if (!sessions[target.index]) return document
  sessions[target.index][target.field] = text
  return setSlotValue(document, target.slot.id, sessions, { byHand: true })
}

export function targetKey(target: TextEditTarget): string {
  if (target.kind === 'value') return `text:${target.slot.id}`
  if (target.kind === 'item') return `text:${target.slot.id}:${target.index}`
  return `text:${target.slot.id}:${target.index}:${target.field}`
}
