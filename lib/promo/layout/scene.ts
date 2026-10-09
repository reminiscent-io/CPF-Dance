import { resolveColor, withAlpha } from '../brand'
import { resolveSlotValue, isSessionList, isStringList } from '../document'
import { getPromoFont, nearestWeight } from '../fonts'
import type {
  Box,
  BrandTokens,
  ColorToken,
  DesignDocument,
  FontRole,
  FormatLayout,
  FrozenText,
  Layer,
  PhotoLook,
  PhotoPlacement,
  PromoFormat,
  SessionValue,
  SlotDef,
  TemplateDefinition,
  TextLayer,
} from '../types'
import { coverRect, type DrawRect } from './crop'
import { layoutRepeater } from './repeater'
import { fitTextWithFrozen, type MeasureText } from './text'

/**
 * Turns template + document + brand into a flat list of drawable nodes with
 * absolute positions, resolved colours, fonts and line breaks. The editor and
 * every export draw this same list, so they can't drift apart.
 */

interface SceneBase {
  key: string
  layerId: string
  /** Top-level layer that owns this node; what the editor selects. */
  rootLayerId: string
  itemIndex?: number
  opacity?: number
}

export interface SceneRect extends SceneBase {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  cornerRadius?: number
  gradient?: {
    start: { x: number; y: number }
    end: { x: number; y: number }
    stops: [number, string, number, string]
  }
}

export interface SceneEllipse extends SceneBase {
  type: 'ellipse'
  x: number
  y: number
  width: number
  height: number
  fill?: string
  stroke?: string
  strokeWidth?: number
}

export interface SceneLine extends SceneBase {
  type: 'line'
  points: [number, number, number, number]
  stroke: string
  strokeWidth: number
}

export interface SceneText extends SceneBase {
  type: 'text'
  slotId?: string
  /** Inside a repeater item: which part of the item value this shows. */
  field?: TextLayer['field']
  uppercase?: boolean
  x: number
  y: number
  width: number
  height: number
  text: string
  lines: string[]
  fontFamily: string
  fontWeight: number
  fontSize: number
  letterSpacing: number
  lineHeight: number
  align: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
  fill: string
  overflow: boolean
}

export interface ScenePhoto extends SceneBase {
  type: 'photo'
  slotId: string
  index: number
  x: number
  y: number
  width: number
  height: number
  mask: 'rect' | 'ellipse'
  cornerRadius?: number
  assetId?: string
  /** Image rect in slot-local coordinates. */
  draw?: DrawRect
  placeholder: string
  look?: PhotoLook
}

export interface SceneLogo extends SceneBase {
  type: 'logo'
  x: number
  y: number
  width: number
  height: number
  path: string
}

export type SceneNode = SceneRect | SceneEllipse | SceneLine | SceneText | ScenePhoto | SceneLogo

export interface SceneWarning {
  layerId: string
  slotId?: string
  message: string
}

export interface Scene {
  width: number
  height: number
  background: string
  nodes: SceneNode[]
  /** Text layouts to persist in the document so other devices reuse them. */
  textLayout: Record<string, FrozenText>
  warnings: SceneWarning[]
}

export interface AssetDimensions {
  width: number
  height: number
}

export interface BuildSceneInput {
  definition: TemplateDefinition
  format: PromoFormat
  document: DesignDocument
  brand: BrandTokens
  measure: MeasureText
  /** Original dimensions per asset id. Missing ids draw as placeholders. */
  assets: Record<string, AssetDimensions | undefined>
}

export function getFormatLayout(definition: TemplateDefinition, format: PromoFormat): FormatLayout {
  const layout = definition.formats[format]
  if (!layout) throw new Error(`This template has no ${format} layout`)
  return layout
}

export function applyNudge(box: Box, nudge: Partial<Box> | undefined): Box {
  if (!nudge) return box
  return {
    x: nudge.x ?? box.x,
    y: nudge.y ?? box.y,
    width: nudge.width ?? box.width,
    height: nudge.height ?? box.height,
  }
}

interface EmitContext {
  rootLayerId: string
  keyPrefix: string
  fontScale: number
  strokeScale: number
  itemIndex?: number
  itemValue?: string | SessionValue
  itemPhoto?: PhotoPlacement
  repeaterSlot?: string
}

function gradientPoints(
  direction: 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top',
  width: number,
  height: number
) {
  switch (direction) {
    case 'left-right':
      return { start: { x: 0, y: 0 }, end: { x: width, y: 0 } }
    case 'right-left':
      return { start: { x: width, y: 0 }, end: { x: 0, y: 0 } }
    case 'top-bottom':
      return { start: { x: 0, y: 0 }, end: { x: 0, y: height } }
    case 'bottom-top':
      return { start: { x: 0, y: height }, end: { x: 0, y: 0 } }
  }
}

export function buildScene(input: BuildSceneInput): Scene {
  const { definition, document, brand, measure } = input
  const layout = getFormatLayout(definition, input.format)
  const variant =
    definition.variants[document.variant] ?? definition.variants[definition.defaultVariant] ?? null
  const color = (token: ColorToken) => resolveColor(token, brand, variant)
  const slots = new Map<string, SlotDef>(definition.slots.map((slot) => [slot.id, slot]))

  const nodes: SceneNode[] = []
  const warnings: SceneWarning[] = []
  const textLayout: Record<string, FrozenText> = {}

  const textValue = (layer: TextLayer, ctx: EmitContext): { text: string; items?: string[] } => {
    if (ctx.itemValue !== undefined && layer.field) {
      if (typeof ctx.itemValue === 'string') return { text: layer.field === 'item' ? ctx.itemValue : '' }
      if (layer.field === 'item') return { text: '' }
      return { text: ctx.itemValue[layer.field] ?? '' }
    }
    if (layer.slot) {
      const slot = slots.get(layer.slot)
      if (!slot) return { text: '' }
      const value = resolveSlotValue(slot, document, brand)
      if (value === undefined) return { text: '' }
      if (typeof value === 'string') return { text: value }
      if (isSessionList(value)) return { text: value.map((s) => `${s.weekday} ${s.date} ${s.time}`).join('\n') }
      if (isStringList(value)) {
        const items = value.map((item) => item.trim()).filter(Boolean)
        return layer.join !== undefined ? { text: items.join(layer.join), items } : { text: items.join(' ') }
      }
      return { text: '' }
    }
    return { text: layer.text ?? '' }
  }

  const emit = (layer: Layer, box: Box, ctx: EmitContext) => {
    const base = {
      key: `${ctx.keyPrefix}${layer.id}`,
      layerId: layer.id,
      rootLayerId: ctx.rootLayerId,
      itemIndex: ctx.itemIndex,
      opacity: layer.opacity,
    }

    switch (layer.kind) {
      case 'shape': {
        const strokeWidth = (layer.strokeWidth ?? (layer.shape === 'line' ? 1 : 0)) * ctx.strokeScale
        if (layer.shape === 'line') {
          nodes.push({
            ...base,
            type: 'line',
            points: [box.x, box.y, box.x + box.width, box.y + box.height],
            stroke: color(layer.stroke ?? layer.fill ?? 'ink'),
            strokeWidth: Math.max(0.5, strokeWidth),
          })
          return
        }
        if (layer.shape === 'ellipse') {
          nodes.push({
            ...base,
            type: 'ellipse',
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            fill: layer.fill ? color(layer.fill) : undefined,
            stroke: layer.stroke ? color(layer.stroke) : undefined,
            strokeWidth: layer.stroke ? strokeWidth : undefined,
          })
          return
        }
        const gradient = layer.gradient
          ? {
              ...gradientPoints(layer.gradient.direction, box.width, box.height),
              stops: [
                0,
                withAlpha(color(layer.gradient.from), layer.gradient.fromAlpha ?? 1),
                1,
                withAlpha(color(layer.gradient.to), layer.gradient.toAlpha ?? 1),
              ] as [number, string, number, string],
            }
          : undefined
        nodes.push({
          ...base,
          type: 'rect',
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          fill: !gradient && layer.fill ? color(layer.fill) : undefined,
          stroke: layer.stroke ? color(layer.stroke) : undefined,
          strokeWidth: layer.stroke ? strokeWidth : undefined,
          cornerRadius: layer.cornerRadius !== undefined ? layer.cornerRadius * ctx.strokeScale : undefined,
          gradient,
        })
        return
      }

      case 'text': {
        const { text, items } = textValue(layer, ctx)
        if (!text.trim()) return
        const font = getPromoFont(brand.fonts[layer.style.font as FontRole], layer.style.font)
        const weight = nearestWeight(font, layer.style.weight)
        const style = {
          ...layer.style,
          weight,
          size: layer.style.size * ctx.fontScale,
          minSize: (layer.style.minSize ?? layer.style.size * 0.6) * ctx.fontScale,
        }
        const fitInput = {
          text,
          listItems: items,
          listJoin: layer.join,
          family: font.family,
          style,
          width: box.width,
          height: box.height,
        }
        const key = base.key
        const { fit, hash } = fitTextWithFrozen(measure, fitInput, document.layout[key])
        textLayout[key] = { hash, size: fit.size, lines: fit.lines }
        if (fit.overflow) {
          warnings.push({
            layerId: ctx.rootLayerId,
            slotId: layer.slot ?? ctx.repeaterSlot,
            message: `${layer.name ?? 'Text'} doesn't fit its space. Shorten it or ask for a shorter version.`,
          })
        }
        const letterSpacing = (style.tracking ?? 0) * fit.size
        const align = style.align ?? 'center'
        // Konva adds spacing after the last letter too; shift so the visible
        // glyphs sit where the alignment says.
        const shift = align === 'center' ? letterSpacing / 2 : align === 'right' ? letterSpacing : 0
        const fill = color(style.color)
        nodes.push({
          ...base,
          type: 'text',
          slotId: layer.slot ?? ctx.repeaterSlot,
          field: layer.field,
          uppercase: style.uppercase,
          x: box.x + shift,
          y: box.y,
          width: box.width,
          height: box.height,
          text: fit.lines.join('\n'),
          lines: fit.lines,
          fontFamily: font.family,
          fontWeight: weight,
          fontSize: fit.size,
          letterSpacing,
          lineHeight: style.lineHeight ?? 1.2,
          align,
          verticalAlign: style.verticalAlign ?? 'middle',
          fill,
          overflow: fit.overflow,
        })
        if (layer.decoration === 'rules' && fit.lines.length > 0) {
          const visibleWidth = Math.max(0, fit.maxLineWidth - letterSpacing)
          const centerX = box.x + box.width / 2
          const midY = box.y + box.height / 2
          const gap = fit.size * 0.9
          const leftEnd = centerX - visibleWidth / 2 - gap
          const rightStart = centerX + visibleWidth / 2 + gap
          const strokeWidth = Math.max(0.75, fit.size * 0.07)
          if (leftEnd - box.x > fit.size) {
            nodes.push({
              ...base,
              key: `${base.key}:rule-left`,
              type: 'line',
              points: [box.x, midY, leftEnd, midY],
              stroke: fill,
              strokeWidth,
            })
          }
          if (box.x + box.width - rightStart > fit.size) {
            nodes.push({
              ...base,
              key: `${base.key}:rule-right`,
              type: 'line',
              points: [rightStart, midY, box.x + box.width, midY],
              stroke: fill,
              strokeWidth,
            })
          }
        }
        return
      }

      case 'photo': {
        const slotId = layer.slot ?? ctx.repeaterSlot ?? ''
        const placement = ctx.itemPhoto ?? (layer.slot ? document.photos[layer.slot]?.[0] : undefined)
        const dims = placement ? input.assets[placement.assetId] : undefined
        if (placement && !dims) {
          warnings.push({ layerId: ctx.rootLayerId, slotId, message: 'A photo in this design is no longer in the library.' })
        }
        nodes.push({
          ...base,
          type: 'photo',
          slotId,
          index: ctx.itemIndex ?? 0,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          mask: layer.mask ?? 'rect',
          cornerRadius: layer.cornerRadius,
          assetId: dims ? placement?.assetId : undefined,
          draw: dims && placement ? coverRect(dims, { width: box.width, height: box.height }, placement) : undefined,
          placeholder: color(layer.placeholder ?? 'paperDeep'),
          look: placement?.look,
        })
        return
      }

      case 'logo': {
        if (!brand.logoPath) return
        nodes.push({ ...base, type: 'logo', x: box.x, y: box.y, width: box.width, height: box.height, path: brand.logoPath })
        return
      }

      case 'repeater': {
        const slot = slots.get(layer.slot)
        if (!slot) return
        let values: (string | SessionValue)[] = []
        let photos: PhotoPlacement[] = []
        if (slot.kind === 'photos') {
          photos = document.photos[slot.id] ?? []
        } else {
          const value = resolveSlotValue(slot, document, brand)
          if (isSessionList(value)) values = value
          else if (isStringList(value)) values = value.map((item) => item.trim()).filter(Boolean)
        }
        const count = slot.kind === 'photos' ? photos.length : values.length
        const result = layoutRepeater(layer, box, count)
        if (result.overflow) {
          warnings.push({
            layerId: ctx.rootLayerId,
            slotId: slot.id,
            message: `${slot.label} has more items than fit. Remove one or shorten them.`,
          })
        }
        result.cells.forEach((cell, index) => {
          for (const child of layer.item.layers) {
            const childBox = {
              x: cell.x + child.box.x * cell.sx,
              y: cell.y + child.box.y * cell.sy,
              width: child.box.width * cell.sx,
              height: child.box.height * cell.sy,
            }
            emit(child, childBox, {
              rootLayerId: ctx.rootLayerId,
              keyPrefix: `${ctx.keyPrefix}${layer.id}:${index}:`,
              fontScale: ctx.fontScale * cell.fontScale,
              strokeScale: ctx.strokeScale * Math.min(cell.sx, cell.sy),
              itemIndex: index,
              itemValue: values[index],
              itemPhoto: photos[index],
              repeaterSlot: slot.id,
            })
          }
        })
        return
      }
    }
  }

  for (const layer of layout.layers) {
    emit(layer, applyNudge(layer.box, document.nudges[layer.id]), {
      rootLayerId: layer.id,
      keyPrefix: '',
      fontScale: 1,
      strokeScale: 1,
    })
  }

  return {
    width: layout.width,
    height: layout.height,
    background: color(layout.background),
    nodes,
    textLayout,
    warnings,
  }
}

/** Font faces a layout needs, so they can load before anything is measured. */
export function fontsForLayout(
  layout: FormatLayout,
  brand: BrandTokens
): { fontId: string; family: string; weight: number }[] {
  const seen = new Map<string, { fontId: string; family: string; weight: number }>()
  const visit = (layers: Layer[]) => {
    for (const layer of layers) {
      if (layer.kind === 'text') {
        const font = getPromoFont(brand.fonts[layer.style.font], layer.style.font)
        const weight = nearestWeight(font, layer.style.weight)
        seen.set(`${font.id}:${weight}`, { fontId: font.id, family: font.family, weight })
      }
      if (layer.kind === 'repeater') visit(layer.item.layers)
    }
  }
  visit(layout.layers)
  return [...seen.values()]
}

/** True when two frozen-layout maps differ, so the editor knows to save. */
export function textLayoutChanged(
  previous: Record<string, FrozenText>,
  next: Record<string, FrozenText>
): boolean {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)])
  for (const key of keys) {
    if (previous[key]?.hash !== next[key]?.hash || previous[key]?.size !== next[key]?.size) return true
  }
  return false
}

/** Slots a format actually draws, so the editor only offers fields that show. */
export function slotsInLayout(layout: FormatLayout): Set<string> {
  const slots = new Set<string>()
  const visit = (layers: Layer[]) => {
    for (const layer of layers) {
      if ((layer.kind === 'text' || layer.kind === 'photo') && layer.slot) slots.add(layer.slot)
      if (layer.kind === 'repeater') {
        slots.add(layer.slot)
        visit(layer.item.layers)
      }
    }
  }
  visit(layout.layers)
  return slots
}
