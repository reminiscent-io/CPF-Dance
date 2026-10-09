import { exampleDocument } from './document'
import type {
  Box,
  DesignDocument,
  Layer,
  PromoFormat,
  SessionValue,
  SlotDef,
  TemplateDefinition,
  TextStyle,
} from './types'

/**
 * Edits the template editor makes to a draft definition. Pure, so every
 * change is one immutable step for undo, and testable without a browser.
 */

function withLayers(
  definition: TemplateDefinition,
  format: PromoFormat,
  change: (layers: Layer[]) => Layer[]
): TemplateDefinition {
  const layout = definition.formats[format]
  if (!layout) return definition
  return { ...definition, formats: { ...definition.formats, [format]: { ...layout, layers: change(layout.layers) } } }
}

export function updateLayer(
  definition: TemplateDefinition,
  format: PromoFormat,
  layerId: string,
  recipe: (layer: Layer) => Layer
): TemplateDefinition {
  return withLayers(definition, format, (layers) => layers.map((layer) => (layer.id === layerId ? recipe(layer) : layer)))
}

export function setLayerBox(definition: TemplateDefinition, format: PromoFormat, layerId: string, box: Box): TemplateDefinition {
  const round = (value: number) => Math.round(value * 2) / 2
  return updateLayer(definition, format, layerId, (layer) => ({
    ...layer,
    box: { x: round(box.x), y: round(box.y), width: round(box.width), height: round(box.height) },
  }))
}

/** Moves a layer one step toward the front (+1) or back (-1). */
export function moveLayer(definition: TemplateDefinition, format: PromoFormat, layerId: string, step: 1 | -1): TemplateDefinition {
  return withLayers(definition, format, (layers) => {
    const index = layers.findIndex((layer) => layer.id === layerId)
    const target = index + step
    if (index === -1 || target < 0 || target >= layers.length) return layers
    const next = [...layers]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  })
}

function allIds(layers: Layer[], into = new Set<string>()): Set<string> {
  for (const layer of layers) {
    into.add(layer.id)
    if (layer.kind === 'repeater') allIds(layer.item.layers, into)
  }
  return into
}

function freshId(base: string, taken: Set<string>): string {
  const stem = base.replace(/_\d+$/, '')
  let n = 2
  while (taken.has(`${stem}_${n}`)) n++
  return `${stem}_${n}`
}

export function duplicateLayer(
  definition: TemplateDefinition,
  format: PromoFormat,
  layerId: string
): { definition: TemplateDefinition; id: string | null } {
  const layout = definition.formats[format]
  const source = layout?.layers.find((layer) => layer.id === layerId)
  if (!layout || !source) return { definition, id: null }
  const id = freshId(source.id, allIds(layout.layers))
  const copy = {
    ...structuredClone(source),
    id,
    name: source.name ? `${source.name} copy` : undefined,
    box: { ...source.box, x: source.box.x + 20, y: source.box.y + 20 },
  } as Layer
  return {
    definition: withLayers(definition, format, (layers) => {
      const index = layers.findIndex((layer) => layer.id === layerId)
      return [...layers.slice(0, index + 1), copy, ...layers.slice(index + 1)]
    }),
    id,
  }
}

export function removeLayer(definition: TemplateDefinition, format: PromoFormat, layerId: string): TemplateDefinition {
  return withLayers(definition, format, (layers) => layers.filter((layer) => layer.id !== layerId))
}

const NEW_TEXT_STYLE: TextStyle = {
  font: 'caps',
  weight: 500,
  size: 24,
  minSize: 14,
  tracking: 0.2,
  lineHeight: 1.2,
  align: 'center',
  verticalAlign: 'middle',
  uppercase: true,
  color: 'ink',
  maxLines: 1,
}

/** Adds a text, rectangle or line layer in the middle of the canvas, on top. */
export function addLayer(
  definition: TemplateDefinition,
  format: PromoFormat,
  kind: 'text' | 'rect' | 'line'
): { definition: TemplateDefinition; id: string | null } {
  const layout = definition.formats[format]
  if (!layout) return { definition, id: null }
  const taken = allIds(layout.layers)
  const id = freshId(kind === 'text' ? 'text' : kind === 'rect' ? 'shape' : 'rule', taken)
  const width = Math.round(layout.width * 0.4)
  const x = Math.round((layout.width - width) / 2)
  const y = Math.round(layout.height / 2)
  const layer: Layer =
    kind === 'text'
      ? { id, name: 'Text', kind: 'text', text: 'New text', box: { x, y: y - 20, width, height: 40 }, style: NEW_TEXT_STYLE }
      : kind === 'rect'
        ? { id, name: 'Rectangle', kind: 'shape', shape: 'rect', fill: 'accentSoft', box: { x, y: y - 60, width, height: 120 } }
        : { id, name: 'Rule', kind: 'shape', shape: 'line', stroke: 'accent', strokeWidth: 1.5, box: { x, y, width, height: 0 } }
  return { definition: withLayers(definition, format, (layers) => [...layers, layer]), id }
}

export function updateSlot(definition: TemplateDefinition, slotId: string, recipe: (slot: SlotDef) => SlotDef): TemplateDefinition {
  return { ...definition, slots: definition.slots.map((slot) => (slot.id === slotId ? recipe(slot) : slot)) }
}

const SAMPLE_SESSIONS: SessionValue[] = [
  { weekday: 'Fri', date: 'Nov 13', time: '5:00–7:00 PM' },
  { weekday: 'Sat', date: 'Nov 14', time: '11:00 AM – 1:00 PM' },
  { weekday: 'Sun', date: 'Nov 15', time: '11:00 AM – 1:00 PM' },
  { weekday: 'Mon', date: 'Nov 16', time: '6:30–8:00 PM' },
]

/** Repeats the words of `text` until it reaches `length`, ending on a whole word where possible. */
export function padToLength(text: string, length: number): string {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'W'.repeat(length)
  let out = text.trim()
  let i = 0
  while (out.length < length) out += ` ${words[i++ % words.length]}`
  if (out.length === length) return out
  const cut = out.slice(0, length)
  const lastSpace = cut.lastIndexOf(' ')
  return lastSpace > length * 0.6 ? cut.slice(0, lastSpace) : cut
}

/** Photo frames for previews: ids with a portrait size and no image, so frames draw as placeholders. */
export const STAND_IN_PHOTOS: Record<string, { width: number; height: number }> = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => [
    `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    { width: 3000, height: 4000 },
  ])
)

export interface StressOptions {
  sessions: number
  lists: 'fewest' | 'usual' | 'most'
  longest: boolean
  variant: string
}

/** Sample content for checking a layout at its limits: 1 to 4 dates, the fewest or most list items, the longest copy. */
export function stressDocument(definition: TemplateDefinition, options: StressOptions): DesignDocument {
  const document = exampleDocument(definition)
  document.variant = definition.variants[options.variant] ? options.variant : definition.defaultVariant
  for (const slot of definition.slots) {
    if (slot.kind === 'sessions') {
      document.values[slot.id] = SAMPLE_SESSIONS.slice(0, Math.max(1, Math.min(options.sessions, slot.list?.max ?? 4)))
      continue
    }
    if (slot.binding === 'photo') {
      const ids = Object.keys(STAND_IN_PHOTOS)
      const count =
        slot.kind === 'photo'
          ? 1
          : options.lists === 'fewest'
            ? (slot.list?.min ?? 0)
            : options.lists === 'most'
              ? (slot.list?.max ?? 4)
              : (slot.list?.target ?? slot.list?.max ?? 4)
      const offset = slot.kind === 'photo' ? 0 : 1
      document.photos[slot.id] = ids
        .slice(offset, offset + count)
        .map((assetId) => ({ assetId, focusX: 0.5, focusY: 0.4, zoom: 1 }))
      continue
    }
    if (slot.binding !== 'copy') continue
    if (slot.kind === 'list') {
      const example = Array.isArray(slot.example) ? (slot.example as string[]) : []
      const count =
        options.lists === 'most' ? (slot.list?.max ?? example.length) : options.lists === 'fewest' ? (slot.list?.min ?? 1) : example.length
      const items = Array.from({ length: count }, (_, index) => example[index % Math.max(1, example.length)] ?? `Item ${index + 1}`)
      document.values[slot.id] =
        options.longest && slot.maxChars ? items.map((item) => padToLength(item, slot.maxChars!)) : items
    } else if (slot.kind === 'text' && options.longest && slot.maxChars && typeof slot.example === 'string') {
      document.values[slot.id] = padToLength(slot.example, slot.maxChars)
    }
  }
  return document
}
