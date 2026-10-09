import type { Box, RepeaterLayer } from '../types'

export interface RepeaterCell {
  x: number
  y: number
  width: number
  height: number
  /** Scale from item units to the cell, per axis. */
  sx: number
  sy: number
  /** Scale for type inside the cell. */
  fontScale: number
}

export interface RepeaterLayout {
  cells: RepeaterCell[]
  /** Items still didn't fit after scaling or wrapping. */
  overflow: boolean
}

function alignOffset(free: number, align: RepeaterLayer['align']): number {
  if (free <= 0) return 0
  if (align === 'start') return 0
  if (align === 'end') return free
  return free / 2
}

/**
 * Positions `count` items of a repeater inside `box`.
 *
 * fill: items share the main axis evenly (the photo strip).
 * fixed: items keep their template size, centred; when they don't fit they
 * either scale down together (date circles) or wrap into extra columns or
 * rows that split the cross axis (feature pills).
 */
export function layoutRepeater(layer: RepeaterLayer, box: Box, rawCount: number): RepeaterLayout {
  const count = Math.max(0, Math.min(rawCount, layer.maxVisible ?? rawCount))
  if (count === 0) return { cells: [], overflow: false }

  const row = layer.direction === 'row'
  const mainSize = row ? box.width : box.height
  const crossSize = row ? box.height : box.width
  const itemMain = row ? layer.item.width : layer.item.height
  const itemCross = row ? layer.item.height : layer.item.width
  const gap = layer.gap

  const place = (main: number, cross: number, mainLen: number, crossLen: number) =>
    row
      ? { x: box.x + main, y: box.y + cross, width: mainLen, height: crossLen }
      : { x: box.x + cross, y: box.y + main, width: crossLen, height: mainLen }

  if (layer.sizing === 'fill') {
    const cellMain = Math.max(0, (mainSize - gap * (count - 1)) / count)
    const cells: RepeaterCell[] = []
    for (let i = 0; i < count; i++) {
      const rect = place(i * (cellMain + gap), 0, cellMain, crossSize)
      const sx = rect.width / layer.item.width
      const sy = rect.height / layer.item.height
      cells.push({ ...rect, sx, sy, fontScale: Math.min(sx, sy) })
    }
    return { cells, overflow: false }
  }

  const total = count * itemMain + (count - 1) * gap
  const crossOffset = (len: number) => Math.max(0, (crossSize - len) / 2)

  if (total <= mainSize + 0.5) {
    const start = alignOffset(mainSize - total, layer.align)
    const cells: RepeaterCell[] = []
    for (let i = 0; i < count; i++) {
      const rect = place(start + i * (itemMain + gap), crossOffset(itemCross), itemMain, itemCross)
      cells.push({ ...rect, sx: 1, sy: 1, fontScale: 1 })
    }
    return { cells, overflow: itemCross > crossSize + 0.5 }
  }

  if (layer.overflow === 'wrap' && count > 1) {
    const perLineMax = Math.max(1, Math.floor((mainSize + gap) / (itemMain + gap)))
    const lines = Math.ceil(count / perLineMax)
    const perLine = Math.ceil(count / lines)
    const cellCross = Math.max(0, (crossSize - gap * (lines - 1)) / lines)
    const cells: RepeaterCell[] = []
    for (let line = 0; line < lines; line++) {
      const inLine = Math.min(perLine, count - line * perLine)
      const lineTotal = inLine * itemMain + (inLine - 1) * gap
      const start = alignOffset(mainSize - lineTotal, layer.align)
      for (let j = 0; j < inLine; j++) {
        const rect = place(start + j * (itemMain + gap), line * (cellCross + gap), itemMain, cellCross)
        const crossScale = cellCross / itemCross
        cells.push({
          ...rect,
          sx: row ? 1 : crossScale,
          sy: row ? crossScale : 1,
          fontScale: 1,
        })
      }
    }
    const usedMain = perLine * itemMain + (perLine - 1) * gap
    return { cells, overflow: usedMain > mainSize + 0.5 }
  }

  // Scale everything down together, but not below minScale.
  const fitScale = Math.min((mainSize - gap * (count - 1)) / (count * itemMain), crossSize / itemCross)
  const scale = Math.max(layer.minScale ?? 0.5, Math.min(1, fitScale))
  const scaledMain = itemMain * scale
  const scaledCross = itemCross * scale
  const scaledTotal = count * scaledMain + (count - 1) * gap
  const start = alignOffset(mainSize - scaledTotal, layer.align)
  const cells: RepeaterCell[] = []
  for (let i = 0; i < count; i++) {
    const rect = place(start + i * (scaledMain + gap), crossOffset(scaledCross), scaledMain, scaledCross)
    cells.push({ ...rect, sx: scale, sy: scale, fontScale: scale })
  }
  return { cells, overflow: scaledTotal > mainSize + 0.5 }
}
