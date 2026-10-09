import { z } from 'zod'
import {
  BACKGROUND_TYPES,
  COLOR_TOKENS,
  PHOTO_LOOKS,
  SHOT_TYPES,
  type BrandTokens,
  type DesignDocument,
  type Layer,
  type PromoBrief,
  type SlotDef,
  type TemplateDefinition,
} from './types'
import { PROMO_FONTS } from './fonts'

/**
 * Runtime validation for everything that crosses an API boundary: template
 * definitions (admin saves), design documents (autosave), brand kits and
 * generation briefs. The TypeScript shapes live in ./types.
 */

const finite = z.number().finite()

export const BoxSchema = z.object({
  x: finite,
  y: finite,
  width: finite.min(0),
  height: finite.min(0),
})

const ColorTokenSchema = z.enum(COLOR_TOKENS)
const FontRoleSchema = z.enum(['display', 'caps', 'script'])
const FormatSchema = z.enum(['ig_post', 'ig_story', 'poster'])

export const TextStyleSchema = z.object({
  font: FontRoleSchema,
  weight: z.number().int().min(100).max(900),
  size: finite.positive().max(2000),
  minSize: finite.positive().max(2000).optional(),
  tracking: finite.min(-0.2).max(2).optional(),
  lineHeight: finite.min(0.5).max(4).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  verticalAlign: z.enum(['top', 'middle', 'bottom']).optional(),
  uppercase: z.boolean().optional(),
  color: ColorTokenSchema,
  maxLines: z.number().int().min(1).max(30).optional(),
})

const layerBase = {
  id: z.string().min(1).max(64),
  name: z.string().max(80).optional(),
  box: BoxSchema,
  opacity: finite.min(0).max(1).optional(),
}

const ShapeLayerSchema = z.object({
  ...layerBase,
  kind: z.literal('shape'),
  shape: z.enum(['rect', 'ellipse', 'line']),
  fill: ColorTokenSchema.optional(),
  stroke: ColorTokenSchema.optional(),
  strokeWidth: finite.min(0).max(200).optional(),
  cornerRadius: finite.min(0).max(2000).optional(),
  gradient: z
    .object({
      from: ColorTokenSchema,
      to: ColorTokenSchema,
      fromAlpha: finite.min(0).max(1).optional(),
      toAlpha: finite.min(0).max(1).optional(),
      direction: z.enum(['left-right', 'right-left', 'top-bottom', 'bottom-top']),
    })
    .optional(),
})

const TextLayerSchema = z.object({
  ...layerBase,
  kind: z.literal('text'),
  slot: z.string().max(64).optional(),
  field: z.enum(['weekday', 'date', 'time', 'item']).optional(),
  text: z.string().max(500).optional(),
  join: z.string().max(12).optional(),
  style: TextStyleSchema,
  decoration: z.literal('rules').optional(),
  hideWhenEmpty: z.boolean().optional(),
})

const PhotoLayerSchema = z.object({
  ...layerBase,
  kind: z.literal('photo'),
  slot: z.string().max(64).optional(),
  mask: z.enum(['rect', 'ellipse']).optional(),
  cornerRadius: finite.min(0).max(2000).optional(),
  placeholder: ColorTokenSchema.optional(),
})

const LogoLayerSchema = z.object({
  ...layerBase,
  kind: z.literal('logo'),
})

const RepeaterLayerSchema = z.object({
  ...layerBase,
  kind: z.literal('repeater'),
  slot: z.string().max(64),
  direction: z.enum(['row', 'column']),
  gap: finite.min(0).max(2000),
  align: z.enum(['start', 'center', 'end']).optional(),
  sizing: z.enum(['fixed', 'fill']),
  item: z.object({
    width: finite.positive().max(10000),
    height: finite.positive().max(10000),
    get layers() {
      return z.array(LayerSchema).max(40)
    },
  }),
  overflow: z.enum(['scale', 'wrap']).optional(),
  maxVisible: z.number().int().min(1).max(20).optional(),
  minScale: finite.min(0.1).max(1).optional(),
})

export const LayerSchema: z.ZodType<Layer> = z.discriminatedUnion('kind', [
  ShapeLayerSchema,
  TextLayerSchema,
  PhotoLayerSchema,
  LogoLayerSchema,
  RepeaterLayerSchema,
])

const SessionValueSchema = z.object({
  weekday: z.string().max(20),
  date: z.string().max(30),
  time: z.string().max(40),
})

export const SlotValueSchema = z.union([
  z.string().max(2000),
  z.array(z.string().max(500)).max(20),
  z.array(SessionValueSchema).max(12),
])

const SlotDefSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/, 'Slot ids are lowercase letters, digits and underscores'),
  label: z.string().min(1).max(60),
  binding: z.enum(['copy', 'fact', 'brand', 'photo']),
  kind: z.enum(['text', 'list', 'sessions', 'photo', 'photos']),
  source: z
    .enum([
      'sessions',
      'level',
      'location',
      'price',
      'name',
      'ledBy',
      'signature',
      'credentialPrimary',
      'credentialSecondary',
    ])
    .optional(),
  guidance: z.string().max(500).optional(),
  maxChars: z.number().int().min(1).max(600).optional(),
  list: z
    .object({
      min: z.number().int().min(0).max(20),
      max: z.number().int().min(1).max(20),
      target: z.number().int().min(0).max(20).optional(),
    })
    .optional(),
  preferredShots: z.array(z.enum(SHOT_TYPES)).max(SHOT_TYPES.length).optional(),
  required: z.boolean().optional(),
  aliases: z.array(z.string().min(1).max(40)).max(12).optional(),
  example: SlotValueSchema.optional(),
})

const FormatLayoutSchema = z.object({
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
  background: ColorTokenSchema,
  safeArea: z.object({ top: finite.min(0), bottom: finite.min(0) }).optional(),
  bleed: finite.min(0).max(500).optional(),
  layers: z.array(LayerSchema).max(250),
})

export const TemplateDefinitionSchema = z.object({
  name: z.string().min(1).max(80),
  slots: z.array(SlotDefSchema).min(1).max(60),
  variants: z.record(
    z.string().regex(/^[a-z][a-z0-9_]{0,30}$/),
    z.object({
      label: z.string().min(1).max(40),
      remap: z.partialRecord(ColorTokenSchema, ColorTokenSchema),
    })
  ),
  defaultVariant: z.string().min(1),
  formats: z.object({
    ig_post: FormatLayoutSchema.optional(),
    ig_story: FormatLayoutSchema.optional(),
    poster: FormatLayoutSchema.optional(),
  }),
})

const PhotoPlacementSchema = z.object({
  assetId: z.guid(),
  focusX: finite.min(0).max(1),
  focusY: finite.min(0).max(1),
  zoom: finite.min(1).max(8),
  look: z.enum(PHOTO_LOOKS).optional(),
})

export const DesignDocumentSchema = z.object({
  v: z.literal(1),
  variant: z.string().min(1).max(40),
  values: z.record(z.string().max(64), SlotValueSchema),
  photos: z.record(z.string().max(64), z.array(PhotoPlacementSchema).max(12)),
  edited: z.array(z.string().max(64)).max(100),
  nudges: z.record(z.string().max(64), BoxSchema.partial()),
  layout: z.record(
    z.string().max(120),
    z.object({
      hash: z.string().max(32),
      size: finite.positive().max(2000),
      lines: z.array(z.string().max(600)).max(40),
    })
  ),
})

const hex = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, 'Use a hex colour like #b89651')

export const BrandTokensSchema = z.object({
  colors: z.record(ColorTokenSchema, hex),
  fonts: z.object({
    display: z.string().max(60),
    caps: z.string().max(60),
    script: z.string().max(60),
  }),
  identity: z.object({
    name: z.string().max(80),
    ledBy: z.string().max(40),
    signature: z.string().max(80),
    credentialPrimary: z.string().max(120),
    credentialSecondary: z.string().max(160),
  }),
  voice: z.object({
    notes: z.string().max(2000),
    bannedWords: z.array(z.string().min(1).max(40)).max(60),
  }),
  logoPath: z.string().max(300).nullable().optional(),
})

const SessionInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.string().regex(/^\d{1,2}:\d{2}$/),
  end: z.string().regex(/^\d{1,2}:\d{2}$/),
})

export const PromoBriefSchema = z.object({
  format: FormatSchema,
  classIds: z.array(z.guid()).max(8),
  photoIds: z.array(z.guid()).min(1, 'Pick at least one photo').max(5, 'Pick up to five photos'),
  classType: z.string().max(60),
  titleIdea: z.string().max(120),
  focusPoints: z.string().max(600),
  level: z.enum(['all', 'beginner', 'intermediate', 'advanced', 'pre_professional', 'custom']),
  levelText: z.string().max(60),
  price: z.string().max(60),
  location: z.string().max(120),
  vibe: z.string().max(600),
  sessions: z.array(SessionInputSchema).max(8),
})

export const AssetTagsSchema = z.object({
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  shotTypes: z.array(z.enum(SHOT_TYPES)).max(SHOT_TYPES.length).optional(),
  background: z.enum(BACKGROUND_TYPES).optional(),
  mood: z.string().max(80).optional(),
  description: z.string().max(240).optional(),
})

const NormalizedPointSchema = z.object({ x: finite.min(0).max(1), y: finite.min(0).max(1) })

export const AssetPoseSchema = z.object({
  subject: z
    .object({ x: finite.min(0).max(1), y: finite.min(0).max(1), w: finite.min(0).max(1), h: finite.min(0).max(1) })
    .optional(),
  head: NormalizedPointSchema.optional(),
  feet: NormalizedPointSchema.optional(),
  source: z.enum(['pose', 'vision']),
  shots: z.array(z.enum(SHOT_TYPES)).max(SHOT_TYPES.length).optional(),
})

// Compile-time checks that the schemas and the hand-written types agree.
type Assert<T extends true> = T
type Extends<A, B> = A extends B ? true : false
export type _SchemaChecks = [
  Assert<Extends<z.infer<typeof DesignDocumentSchema>, DesignDocument>>,
  Assert<Extends<z.infer<typeof BrandTokensSchema>, BrandTokens>>,
  Assert<Extends<z.infer<typeof PromoBriefSchema>, PromoBrief>>,
  Assert<Extends<z.infer<typeof TemplateDefinitionSchema>, TemplateDefinition>>,
]

function walkLayers(layers: Layer[], visit: (layer: Layer, inItem: boolean) => void, inItem = false) {
  for (const layer of layers) {
    visit(layer, inItem)
    if (layer.kind === 'repeater') walkLayers(layer.item.layers, visit, true)
  }
}

/**
 * Referential checks the schema can't express: layers point at slots that
 * exist and have the right kind, ids are unique per format, the default
 * variant exists, and story text stays inside the safe area.
 * Returns readable problems; an empty list means the template is usable.
 */
export function checkTemplateIntegrity(definition: TemplateDefinition): string[] {
  const problems: string[] = []
  const slots = new Map<string, SlotDef>()
  for (const slot of definition.slots) {
    if (slots.has(slot.id)) problems.push(`Two slots are named "${slot.id}".`)
    slots.set(slot.id, slot)
    if (slot.list && slot.list.min > slot.list.max) {
      problems.push(`Slot "${slot.label}" allows fewer items at most than at least.`)
    }
    if (slot.binding === 'photo' && slot.kind !== 'photo' && slot.kind !== 'photos') {
      problems.push(`Photo slot "${slot.label}" must hold one photo or a list of photos.`)
    }
  }
  if (!definition.variants[definition.defaultVariant]) {
    problems.push(`Default variant "${definition.defaultVariant}" doesn't exist.`)
  }

  for (const [format, layout] of Object.entries(definition.formats)) {
    if (!layout) continue
    const ids = new Set<string>()
    walkLayers(layout.layers, (layer, inItem) => {
      const where = `${format} layer "${layer.name ?? layer.id}"`
      if (!inItem) {
        if (ids.has(layer.id)) problems.push(`${format}: two layers share the id "${layer.id}".`)
        ids.add(layer.id)
      }
      if (layer.kind === 'text' && layer.slot) {
        const slot = slots.get(layer.slot)
        if (!slot) problems.push(`${where} uses a slot that doesn't exist ("${layer.slot}").`)
        else if (slot.kind === 'photo' || slot.kind === 'photos') {
          problems.push(`${where} is text but its slot holds photos.`)
        }
      }
      if (layer.kind === 'photo' && layer.slot) {
        const slot = slots.get(layer.slot)
        if (!slot) problems.push(`${where} uses a slot that doesn't exist ("${layer.slot}").`)
        else if (slot.kind !== 'photo' && slot.kind !== 'photos') {
          problems.push(`${where} is a photo frame but its slot holds text.`)
        }
      }
      if (layer.kind === 'repeater') {
        const slot = slots.get(layer.slot)
        if (!slot) problems.push(`${where} repeats a slot that doesn't exist ("${layer.slot}").`)
        else if (slot.kind === 'text' || slot.kind === 'photo') {
          problems.push(`${where} repeats "${slot.label}", which holds a single value.`)
        }
      }
      if (layout.safeArea && !inItem && (layer.kind === 'text' || layer.kind === 'repeater')) {
        const isTextRepeater =
          layer.kind === 'text' || layer.item.layers.some((child) => child.kind === 'text')
        const top = layer.box.y
        const bottom = layer.box.y + layer.box.height
        if (
          isTextRepeater &&
          (top < layout.safeArea.top || bottom > layout.height - layout.safeArea.bottom)
        ) {
          problems.push(`${where} has text inside the story's top or bottom safe area.`)
        }
      }
    })
  }
  return problems
}

/** Font ids in a brand kit must exist and suit their role. */
export function checkBrandFonts(tokens: BrandTokens): string[] {
  const problems: string[] = []
  for (const [role, id] of Object.entries(tokens.fonts) as [keyof BrandTokens['fonts'], string][]) {
    const font = PROMO_FONTS[id]
    if (!font) problems.push(`Unknown font "${id}" for the ${role} role.`)
    else if (!font.roles.includes(role)) problems.push(`${font.label} isn't offered for the ${role} role.`)
  }
  return problems
}
