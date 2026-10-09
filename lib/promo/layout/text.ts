import type { FrozenText, TextStyle } from '../types'

/**
 * Text layout for promo layers. Pure: the caller supplies `measure`, which in
 * the browser is canvas measureText with the same font string Konva uses, and
 * in tests is a fake. Widths follow Konva's own rule (whole-string width plus
 * one letter-spacing per grapheme) so what we fit is what Konva draws.
 */

export interface FontSpec {
  family: string
  weight: number
  size: number
}

export type MeasureText = (text: string, font: FontSpec) => number

export interface TextFitInput {
  text: string
  /** Already-joined list items, kept unbreakable when `listJoin` is set. */
  listItems?: string[]
  listJoin?: string
  family: string
  style: TextStyle
  width: number
  height: number
}

export interface TextFit {
  size: number
  lines: string[]
  /** Widest drawn line, in px. */
  maxLineWidth: number
  overflow: boolean
  /** True when the lines came from the document's frozen layout. */
  frozen: boolean
}

const graphemeSegmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

export function graphemeCount(text: string): number {
  if (!graphemeSegmenter) return Array.from(text).length
  let count = 0
  for (const _ of graphemeSegmenter.segment(text)) count++
  return count
}

export function applyCase(text: string, style: TextStyle): string {
  return style.uppercase ? text.toLocaleUpperCase('en-US') : text
}

export function trackingPx(style: TextStyle, size: number): number {
  return (style.tracking ?? 0) * size
}

export function measureLine(
  measure: MeasureText,
  line: string,
  family: string,
  weight: number,
  size: number,
  tracking: number
): number {
  if (!line) return 0
  return measure(line, { family, weight, size }) + tracking * graphemeCount(line)
}

/** Dashes and separators never start a line; they travel with the word before them. */
const GLUE_TO_PREVIOUS = /^[–—\-|/]$/

function splitWords(paragraph: string): string[] {
  const words: string[] = []
  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    if (words.length > 0 && GLUE_TO_PREVIOUS.test(word)) words[words.length - 1] += ` ${word}`
    else words.push(word)
  }
  return words
}

/** Greedy word wrap. A word wider than the box gets a line of its own (and overflows). */
export function wrapWords(
  text: string,
  maxWidth: number,
  lineWidth: (line: string) => number
): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = splitWords(paragraph)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = words[0]
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`
      if (lineWidth(candidate) <= maxWidth) {
        current = candidate
      } else {
        lines.push(current)
        current = words[i]
      }
    }
    lines.push(current)
  }
  return lines
}

/**
 * Splits items into exactly `lineCount` contiguous lines that all fit,
 * keeping the widest line as narrow as possible. Lists are short (a dozen
 * items at most), so trying every split is cheap.
 */
function bestPartition(
  items: string[],
  join: string,
  lineCount: number,
  maxWidth: number,
  lineWidth: (line: string) => number
): string[] | null {
  let best: { lines: string[]; widest: number } | null = null
  const search = (start: number, remaining: number, lines: string[], widest: number) => {
    if (best && widest >= best.widest) return
    if (remaining === 1) {
      const line = items.slice(start).join(join)
      const width = lineWidth(line)
      if (width > maxWidth) return
      const total = Math.max(widest, width)
      if (!best || total < best.widest) best = { lines: [...lines, line], widest: total }
      return
    }
    for (let end = start + 1; end <= items.length - (remaining - 1); end++) {
      const line = items.slice(start, end).join(join)
      const width = lineWidth(line)
      if (width > maxWidth) break
      search(end, remaining - 1, [...lines, line], Math.max(widest, width))
    }
  }
  search(0, lineCount, [], 0)
  return best ? (best as { lines: string[] }).lines : null
}

/**
 * List items stay whole. One line if they fit; otherwise the fewest lines
 * that fit, split so the widest line is as narrow as possible (6 focus words
 * become 3 + 3, like the reference poster); greedy as a last resort.
 */
export function wrapList(
  items: string[],
  join: string,
  maxWidth: number,
  maxLines: number,
  lineWidth: (line: string) => number
): string[] {
  const clean = items.map((item) => item.trim()).filter(Boolean)
  if (clean.length === 0) return []
  const oneLine = clean.join(join)
  if (lineWidth(oneLine) <= maxWidth || maxLines <= 1) return [oneLine]

  for (let lineCount = 2; lineCount <= Math.min(maxLines, clean.length); lineCount++) {
    const best = bestPartition(clean, join, lineCount, maxWidth, lineWidth)
    if (best) return best
  }

  const greedy: string[] = []
  let current = clean[0]
  for (let i = 1; i < clean.length; i++) {
    const candidate = `${current}${join}${clean[i]}`
    if (lineWidth(candidate) <= maxWidth) current = candidate
    else {
      greedy.push(current)
      current = clean[i]
    }
  }
  greedy.push(current)
  return greedy
}

/**
 * Same line count, narrowest width: evens out ragged lines and orphans
 * ("11:00 AM – 1:00 / PM" becomes "11:00 AM – / 1:00 PM"). The canvas
 * equivalent of CSS text-wrap: balance.
 */
export function balanceWords(
  text: string,
  maxWidth: number,
  lineWidth: (line: string) => number
): string[] {
  const greedy = wrapWords(text, maxWidth, lineWidth)
  if (greedy.length < 2 || text.includes('\n')) return greedy
  const target = greedy.length
  let lo = maxWidth / target
  let hi = maxWidth
  let best = greedy
  for (let i = 0; i < 14 && hi - lo > 0.5; i++) {
    const mid = (lo + hi) / 2
    const attempt = wrapWords(text, mid, lineWidth)
    const fits = attempt.length <= target && attempt.every((line) => lineWidth(line) <= mid)
    if (fits) {
      best = attempt
      hi = mid
    } else {
      lo = mid
    }
  }
  return best
}

/** Konva measures line widths slightly differently from our sum; leave a sliver. */
const WIDTH_SLACK = 0.995

function layoutAt(measure: MeasureText, input: TextFitInput, size: number, balance = false) {
  const { style, family } = input
  const tracking = trackingPx(style, size)
  const lineWidth = (line: string) => measureLine(measure, line, family, style.weight, size, tracking)
  const maxWidth = input.width * WIDTH_SLACK
  const maxLines = style.maxLines ?? 1
  const wrap = balance ? balanceWords : wrapWords
  // Plain text written as a " | " list (credential lines) wraps between items.
  const items = input.listItems ?? (input.text.includes(' | ') ? input.text.split(' | ') : undefined)
  const join = input.listItems ? (input.listJoin ?? ' ') : ' | '
  const lines = items
    ? wrapList(
        items.map((item) => applyCase(item, style)),
        join,
        maxWidth,
        maxLines,
        lineWidth
      )
    : wrap(applyCase(input.text, style), maxWidth, lineWidth)
  const widths = lines.map(lineWidth)
  const maxLineWidth = widths.length ? Math.max(...widths) : 0
  const totalHeight = lines.length * size * (style.lineHeight ?? 1.2)
  const fits =
    lines.length <= maxLines && maxLineWidth <= maxWidth && totalHeight <= input.height + 0.5
  return { lines, maxLineWidth, fits }
}

/**
 * Largest size between the style's size and its floor that fits the box;
 * falls back to the floor and reports overflow when nothing fits.
 */
export function fitText(measure: MeasureText, input: TextFitInput): TextFit {
  const max = input.style.size
  const min = Math.min(max, input.style.minSize ?? max * 0.6)

  // Search sizes with greedy wrapping, then balance the lines at the chosen
  // size; balancing keeps the line count, so it never breaks the fit.
  const finish = (size: number, overflow: boolean) => {
    const balanced = layoutAt(measure, input, size, true)
    return { size, lines: balanced.lines, maxLineWidth: balanced.maxLineWidth, overflow, frozen: false }
  }

  const atMax = layoutAt(measure, input, max)
  if (atMax.fits || max === min) return finish(max, !atMax.fits)
  const atMin = layoutAt(measure, input, min)
  if (!atMin.fits) return finish(min, true)
  // Binary search to a quarter pixel.
  let lo = min
  let hi = max
  let best = { size: min, ...atMin }
  while (hi - lo > 0.25) {
    const mid = (lo + hi) / 2
    const attempt = layoutAt(measure, input, mid)
    if (attempt.fits) {
      best = { size: mid, ...attempt }
      lo = mid
    } else {
      hi = mid
    }
  }
  return finish(Math.floor(best.size * 4) / 4, false)
}

/** FNV-1a, 32-bit. Enough to tell whether a frozen layout still matches its inputs. */
export function hashString(value: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function textLayoutHash(input: TextFitInput): string {
  const { style } = input
  return hashString(
    JSON.stringify([
      input.text,
      input.listItems ?? null,
      input.listJoin ?? null,
      input.family,
      style.weight,
      style.size,
      style.minSize ?? null,
      style.tracking ?? 0,
      style.lineHeight ?? 1.2,
      style.maxLines ?? 1,
      style.uppercase ?? false,
      Math.round(input.width * 100) / 100,
      Math.round(input.height * 100) / 100,
    ])
  )
}

/**
 * Reuse the document's frozen layout when its hash still matches, so every
 * device draws the same line breaks; otherwise lay the text out here.
 */
export function fitTextWithFrozen(
  measure: MeasureText,
  input: TextFitInput,
  frozen: FrozenText | undefined
): { fit: TextFit; hash: string } {
  const hash = textLayoutHash(input)
  if (frozen && frozen.hash === hash) {
    const tracking = trackingPx(input.style, frozen.size)
    const widths = frozen.lines.map((line) =>
      measureLine(measure, line, input.family, input.style.weight, frozen.size, tracking)
    )
    return {
      hash,
      fit: {
        size: frozen.size,
        lines: frozen.lines,
        maxLineWidth: widths.length ? Math.max(...widths) : 0,
        overflow: false,
        frozen: true,
      },
    }
  }
  return { hash, fit: fitText(measure, input) }
}
