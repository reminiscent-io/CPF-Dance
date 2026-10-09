import type { Box } from '../types'

/**
 * Snapping for drags in the editor: a moving layer's left, centre and right
 * edges (and top, middle, bottom) lock to the canvas centre and edges, the
 * story safe-area lines and other layers' edges when they come within the
 * threshold.
 */

export interface Guide {
  orientation: 'vertical' | 'horizontal'
  position: number
}

export interface SnapTargets {
  x: number[]
  y: number[]
}

export function snapTargets(
  canvas: { width: number; height: number; safeArea?: { top: number; bottom: number } },
  others: Box[]
): SnapTargets {
  const x = [0, canvas.width / 2, canvas.width]
  const y = [0, canvas.height / 2, canvas.height]
  if (canvas.safeArea) y.push(canvas.safeArea.top, canvas.height - canvas.safeArea.bottom)
  for (const box of others) {
    x.push(box.x, box.x + box.width / 2, box.x + box.width)
    y.push(box.y, box.y + box.height / 2, box.y + box.height)
  }
  return { x, y }
}

function snapAxis(start: number, size: number, lines: number[], threshold: number) {
  let best: { delta: number; line: number } | null = null
  for (const anchor of [start, start + size / 2, start + size]) {
    for (const line of lines) {
      const delta = line - anchor
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, line }
      }
    }
  }
  return best
}

export function snapBox(box: Box, targets: SnapTargets, threshold: number): { x: number; y: number; guides: Guide[] } {
  const sx = snapAxis(box.x, box.width, targets.x, threshold)
  const sy = snapAxis(box.y, box.height, targets.y, threshold)
  const guides: Guide[] = []
  if (sx) guides.push({ orientation: 'vertical', position: sx.line })
  if (sy) guides.push({ orientation: 'horizontal', position: sy.line })
  return { x: box.x + (sx?.delta ?? 0), y: box.y + (sy?.delta ?? 0), guides }
}
