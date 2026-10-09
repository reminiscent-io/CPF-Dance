/**
 * Promo Studio data model.
 *
 * A promo is data: a template version (layers per format, slot definitions,
 * colour variants), a snapshot of the brand kit, and a design document holding
 * the design's own slot values, photo placements and nudges. The same scene is
 * drawn for the editor and for every export, so a file matches the screen.
 *
 * Templates only reference colour tokens and font roles; the brand snapshot
 * resolves them. See docs/superpowers/specs/2026-10-09-promo-studio-design.md.
 */

export type PromoFormat = 'ig_post' | 'ig_story' | 'poster'

export const PROMO_FORMATS: readonly PromoFormat[] = ['ig_post', 'ig_story', 'poster']

export type FontRole = 'display' | 'caps' | 'script'

export const FONT_ROLES: readonly FontRole[] = ['display', 'caps', 'script']

export const COLOR_TOKENS = [
  'paper',
  'paperLight',
  'paperDeep',
  'ink',
  'inkSoft',
  'accent',
  'accentSoft',
  'darkBlock',
  'onDark',
] as const

export type ColorToken = (typeof COLOR_TOKENS)[number]

export const SHOT_TYPES = [
  'full_body',
  'three_quarter',
  'headshot',
  'kick',
  'arms_up',
  'floor',
  'detail',
  'group',
] as const

export type ShotType = (typeof SHOT_TYPES)[number]

export const BACKGROUND_TYPES = [
  'plain_light',
  'plain_dark',
  'studio',
  'stage',
  'outdoor',
  'busy',
] as const

export type BackgroundType = (typeof BACKGROUND_TYPES)[number]

export const PHOTO_LOOKS = ['natural', 'warm', 'dramatic'] as const

export type PhotoLook = (typeof PHOTO_LOOKS)[number]

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/** Who fills the slot: the model (copy), code (fact, brand) or the photo picker. */
export type SlotBinding = 'copy' | 'fact' | 'brand' | 'photo'

/** Shape of the slot's value. */
export type SlotKind = 'text' | 'list' | 'sessions' | 'photo' | 'photos'

export type FactSource = 'sessions' | 'level' | 'location' | 'price'

export type BrandSource =
  | 'name'
  | 'ledBy'
  | 'signature'
  | 'credentialPrimary'
  | 'credentialSecondary'

export interface SessionValue {
  weekday: string
  date: string
  time: string
}

export interface SlotDef {
  id: string
  /** Shown in the phone Content panel and matched against revision instructions. */
  label: string
  binding: SlotBinding
  kind: SlotKind
  source?: FactSource | BrandSource
  /** Copy slots: what the model should write. */
  guidance?: string
  /** Text: per value. List: per item. */
  maxChars?: number
  /** Item counts for list, sessions and photos slots. `target` is the preferred count. */
  list?: { min: number; max: number; target?: number }
  preferredShots?: ShotType[]
  required?: boolean
  /** Other words that name this slot in a revision instruction ("subtitle" for tagline). */
  aliases?: string[]
  /** Reference content: template previews and prompt examples. */
  example?: SlotValue
}

export type SlotValue = string | string[] | SessionValue[]

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

export interface TextStyle {
  font: FontRole
  weight: number
  size: number
  /** Shrink-to-fit floor. Defaults to 60% of size. */
  minSize?: number
  /** Letter spacing in em. */
  tracking?: number
  /** Line height as a multiple of the font size. */
  lineHeight?: number
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
  uppercase?: boolean
  color: ColorToken
  maxLines?: number
}

interface LayerBase {
  id: string
  name?: string
  box: Box
  opacity?: number
}

export interface ShapeLayer extends LayerBase {
  kind: 'shape'
  shape: 'rect' | 'ellipse' | 'line'
  fill?: ColorToken
  stroke?: ColorToken
  strokeWidth?: number
  cornerRadius?: number
  /** Linear fade between two tokens, e.g. to soften a photo edge into the paper. */
  gradient?: {
    from: ColorToken
    to: ColorToken
    fromAlpha?: number
    toAlpha?: number
    direction: 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top'
  }
}

export interface TextLayer extends LayerBase {
  kind: 'text'
  slot?: string
  /** Inside a repeater item: which part of the item value to show. */
  field?: 'weekday' | 'date' | 'time' | 'item'
  /** Static text when no slot is bound. */
  text?: string
  /** List slots drawn as one block, joined with this separator. */
  join?: string
  style: TextStyle
  /** Hairline rules either side of the text, like the reference's "All levels welcome" divider. */
  decoration?: 'rules'
  hideWhenEmpty?: boolean
}

export interface PhotoLayer extends LayerBase {
  kind: 'photo'
  /** Single-photo slot. Omitted inside a photo repeater item, which uses the item. */
  slot?: string
  mask?: 'rect' | 'ellipse'
  cornerRadius?: number
  placeholder?: ColorToken
}

export interface LogoLayer extends LayerBase {
  kind: 'logo'
}

export interface RepeaterLayer extends LayerBase {
  kind: 'repeater'
  slot: string
  direction: 'row' | 'column'
  gap: number
  align?: 'start' | 'center' | 'end'
  /** fixed: item size from the template, scaled down to fit. fill: items share the main axis. */
  sizing: 'fixed' | 'fill'
  item: { width: number; height: number; layers: Layer[] }
  /** When fixed items don't fit: scale them down, or wrap into more rows/columns. */
  overflow?: 'scale' | 'wrap'
  maxVisible?: number
  minScale?: number
}

export type Layer = ShapeLayer | TextLayer | PhotoLayer | LogoLayer | RepeaterLayer

export type LayerKind = Layer['kind']

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface FormatLayout {
  width: number
  height: number
  background: ColorToken
  /** Instagram story: keep text out of the top and bottom bands. */
  safeArea?: { top: number; bottom: number }
  bleed?: number
  layers: Layer[]
}

export interface TemplateVariant {
  label: string
  /** Swaps one token for another everywhere; applied once, not transitively. */
  remap: Partial<Record<ColorToken, ColorToken>>
}

export interface TemplateDefinition {
  name: string
  slots: SlotDef[]
  variants: Record<string, TemplateVariant>
  defaultVariant: string
  formats: Partial<Record<PromoFormat, FormatLayout>>
}

export const DEFINITION_FORMAT = 1

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export interface BrandIdentity {
  name: string
  ledBy: string
  signature: string
  credentialPrimary: string
  credentialSecondary: string
}

export interface BrandTokens {
  colors: Record<ColorToken, string>
  fonts: Record<FontRole, string>
  identity: BrandIdentity
  voice: { notes: string; bannedWords: string[] }
  logoPath?: string | null
}

// ---------------------------------------------------------------------------
// Designs
// ---------------------------------------------------------------------------

export interface PhotoPlacement {
  assetId: string
  /** Image point (0..1) kept at the slot's centre. */
  focusX: number
  focusY: number
  /** 1 = the image just covers the slot. */
  zoom: number
  look?: PhotoLook
}

export interface FrozenText {
  hash: string
  size: number
  lines: string[]
}

export interface DesignDocument {
  v: 1
  variant: string
  values: Record<string, SlotValue>
  photos: Record<string, PhotoPlacement[]>
  /** Slots she changed by hand. AI revisions leave them alone unless she names them. */
  edited: string[]
  /** Her moves and resizes, by layer id. */
  nudges: Record<string, Partial<Box>>
  /** Line breaks computed by whichever device laid the text out last. */
  layout: Record<string, FrozenText>
}

export type LevelKey =
  | 'all'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'pre_professional'
  | 'custom'

/** One session as entered or derived from a class, in studio local time. */
export interface SessionInput {
  /** YYYY-MM-DD */
  date: string
  /** HH:MM, 24-hour */
  start: string
  /** HH:MM, 24-hour */
  end: string
}

export interface PromoBrief {
  format: PromoFormat
  classIds: string[]
  photoIds: string[]
  classType: string
  titleIdea: string
  focusPoints: string
  level: LevelKey
  levelText: string
  price: string
  location: string
  vibe: string
  sessions: SessionInput[]
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export interface AssetTags {
  orientation?: 'portrait' | 'landscape' | 'square'
  shotTypes?: ShotType[]
  background?: BackgroundType
  mood?: string
  description?: string
}

export interface NormalizedPoint {
  x: number
  y: number
}

export interface AssetPose {
  /** Normalized subject box. */
  subject?: { x: number; y: number; w: number; h: number }
  head?: NormalizedPoint
  feet?: NormalizedPoint
  source: 'pose' | 'vision'
}

export interface PromoAsset {
  id: string
  owner_id: string
  parent_id: string | null
  status: 'ready' | 'pending_review' | 'rejected'
  original_path: string
  display_path: string
  thumb_path: string
  width: number
  height: number
  bytes: number
  original_filename: string | null
  tags: AssetTags
  pose: AssetPose | null
  tags_edited: boolean
  tagged_at: string | null
  favorite: boolean
  created_at: string
}

export interface PromoDesignRow {
  id: string
  owner_id: string
  title: string
  template_version_id: string
  format: PromoFormat
  group_id: string
  class_ids: string[]
  brief: Partial<PromoBrief>
  document: DesignDocument
  brand_snapshot: BrandTokens
  revision: number
  thumbnail_updated_at: string | null
  created_at: string
  updated_at: string
}
