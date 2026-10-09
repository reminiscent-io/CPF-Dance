'use client'

import { fontFileUrl, PROMO_FONTS } from '../fonts'
import { fontsForLayout } from '../layout/scene'
import type { MeasureText } from '../layout/text'
import type { BrandTokens, FormatLayout } from '../types'

const loading = new Map<string, Promise<void>>()

/** Loads one promo font face through FontFace and registers it with the document. */
export function loadPromoFont(fontId: string, weight: number): Promise<void> {
  const key = `${fontId}:${weight}`
  const existing = loading.get(key)
  if (existing) return existing
  const font = PROMO_FONTS[fontId]
  if (!font || typeof FontFace === 'undefined') return Promise.resolve()
  const promise = new FontFace(font.family, `url(${fontFileUrl(font, weight)}) format('woff2')`, {
    weight: String(weight),
    style: 'normal',
    display: 'block',
  })
    .load()
    .then((face) => {
      document.fonts.add(face)
    })
    .catch((error) => {
      loading.delete(key)
      throw error
    })
  loading.set(key, promise)
  return promise
}

/** Every face a layout needs, loaded before any text is measured or drawn. */
export async function loadFontsForLayout(layout: FormatLayout, brand: BrandTokens): Promise<void> {
  await Promise.all(fontsForLayout(layout, brand).map((face) => loadPromoFont(face.fontId, face.weight)))
}

let measureContext: CanvasRenderingContext2D | null = null

/**
 * Canvas text measurement with the exact font string Konva builds
 * ("<style> <variant> <size>px <family>", family quoted when it has spaces),
 * so the widths we fit to are the widths Konva draws.
 */
export const canvasMeasure: MeasureText = (text, font) => {
  if (!measureContext) {
    measureContext = document.createElement('canvas').getContext('2d')
  }
  if (!measureContext) return text.length * font.size * 0.6
  measureContext.font = `${font.weight} normal ${font.size}px "${font.family}"`
  return measureContext.measureText(text).width
}
