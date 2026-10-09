import { describe, expect, it } from 'vitest'
import { coverRect, defaultFocus, focusForOffset } from '../layout/crop'
import { layoutRepeater } from '../layout/repeater'
import {
  balanceWords,
  fitText,
  fitTextWithFrozen,
  textLayoutHash,
  wrapList,
  wrapWords,
  type MeasureText,
} from '../layout/text'
import type { RepeaterLayer, TextStyle } from '../types'

// Every character is 0.6 em wide: easy to reason about in assertions.
const measure: MeasureText = (text, font) => text.length * font.size * 0.6

const baseStyle: TextStyle = { font: 'caps', weight: 500, size: 20, color: 'ink', maxLines: 1, lineHeight: 1.2 }

describe('wrapWords', () => {
  it('breaks greedily on spaces', () => {
    const width = (line: string) => line.length * 10
    expect(wrapWords('one two three four', 90, width)).toEqual(['one two', 'three', 'four'])
  })

  it('keeps explicit line breaks', () => {
    expect(wrapWords('a\nb', 1000, (l) => l.length)).toEqual(['a', 'b'])
  })
})

describe('balanceWords', () => {
  const width = (line: string) => line.length * 10

  it('moves words up so the last line is not an orphan', () => {
    // Greedy at 150 px gives "11:00 AM – 1:00" / "PM"
    expect(wrapWords('11:00 AM – 1:00 PM', 150, width)).toEqual(['11:00 AM – 1:00', 'PM'])
    expect(balanceWords('11:00 AM – 1:00 PM', 150, width)).toEqual(['11:00 AM –', '1:00 PM'])
  })

  it('leaves single lines alone', () => {
    expect(balanceWords('Workshop', 500, width)).toEqual(['Workshop'])
  })

  it('never starts a line with a dash', () => {
    for (const lines of [wrapWords('11:00 AM – 1:00 PM', 90, width), balanceWords('11:00 AM – 1:00 PM', 150, width)]) {
      expect(lines.some((line) => line.startsWith('–'))).toBe(false)
    }
  })
})

describe('wrapList', () => {
  const width = (line: string) => line.length * 10

  it('splits six focus words three and three when one line is too long', () => {
    const items = ['TECHNIQUE', 'STRENGTH', 'STYLING', 'KICKS', 'CLEANLINESS', 'PERFORMANCE']
    expect(wrapList(items, ' | ', 360, 2, width)).toEqual([
      'TECHNIQUE | STRENGTH | STYLING',
      'KICKS | CLEANLINESS | PERFORMANCE',
    ])
  })

  it('stays on one line when everything fits', () => {
    expect(wrapList(['A', 'B'], ' | ', 1000, 2, width)).toEqual(['A | B'])
  })

  it('splits by width, not by count, so a short last item is not stranded', () => {
    const items = ['PROFESSIONAL DANCER', 'CHOREOGRAPHER', 'TEACHER']
    expect(wrapList(items, ' | ', 360, 2, width)).toEqual(['PROFESSIONAL DANCER', 'CHOREOGRAPHER | TEACHER'])
  })
})

describe('fitText', () => {
  it('keeps the design size when the text fits', () => {
    const fit = fitText(measure, { text: 'Workshop', family: 'F', style: baseStyle, width: 200, height: 40 })
    expect(fit.size).toBe(20)
    expect(fit.overflow).toBe(false)
    expect(fit.lines).toEqual(['Workshop'])
  })

  it('shrinks toward the floor to fit one line', () => {
    const style = { ...baseStyle, size: 40, minSize: 10 }
    const fit = fitText(measure, { text: 'PRECISION', family: 'F', style, width: 120, height: 60 })
    // 9 chars at 0.6 em must fit 120 * 0.995 px
    expect(fit.size).toBeLessThanOrEqual((120 * 0.995) / (9 * 0.6))
    expect(fit.size).toBeGreaterThan(20)
    expect(fit.overflow).toBe(false)
  })

  it('reports overflow at the floor instead of shrinking forever', () => {
    const style = { ...baseStyle, size: 40, minSize: 30 }
    const fit = fitText(measure, { text: 'CONDITIONING', family: 'F', style, width: 100, height: 60 })
    expect(fit.size).toBe(30)
    expect(fit.overflow).toBe(true)
  })

  it('applies uppercase before measuring', () => {
    const fit = fitText(measure, {
      text: 'tagline',
      family: 'F',
      style: { ...baseStyle, uppercase: true },
      width: 400,
      height: 40,
    })
    expect(fit.lines).toEqual(['TAGLINE'])
  })

  it('counts letter spacing once per character, the way Konva draws it', () => {
    const style = { ...baseStyle, size: 10, minSize: 10, tracking: 0.5 }
    // 4 chars: 4 * 6 px glyphs + 4 * 5 px spacing = 44 px
    const fits = fitText(measure, { text: 'ABCD', family: 'F', style, width: 44.3, height: 20 })
    const tooTight = fitText(measure, { text: 'ABCD', family: 'F', style, width: 43, height: 20 })
    expect(fits.overflow).toBe(false)
    expect(tooTight.overflow).toBe(true)
  })
})

describe('frozen layouts', () => {
  const input = {
    text: 'Join for an intensive three-day workshop',
    family: 'F',
    style: { ...baseStyle, maxLines: 3 },
    width: 200,
    height: 100,
  }

  it('reuses stored line breaks while the inputs match', () => {
    const hash = textLayoutHash(input)
    const frozen = { hash, size: 18, lines: ['Join for an intensive', 'three-day workshop'] }
    const { fit } = fitTextWithFrozen(measure, input, frozen)
    expect(fit.frozen).toBe(true)
    expect(fit.lines).toEqual(frozen.lines)
    expect(fit.size).toBe(18)
  })

  it('lays the text out again when the box changes', () => {
    const frozen = { hash: textLayoutHash(input), size: 18, lines: ['stale'] }
    const { fit } = fitTextWithFrozen(measure, { ...input, width: 260 }, frozen)
    expect(fit.frozen).toBe(false)
    expect(fit.lines).not.toEqual(['stale'])
  })
})

function repeater(overrides: Partial<RepeaterLayer>): RepeaterLayer {
  return {
    id: 'r',
    kind: 'repeater',
    slot: 's',
    direction: 'row',
    gap: 10,
    align: 'center',
    sizing: 'fixed',
    box: { x: 0, y: 0, width: 460, height: 150 },
    item: { width: 140, height: 140, layers: [] },
    ...overrides,
  }
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: typeof a) {
  return a.x < b.x + b.width - 0.01 && b.x < a.x + a.width - 0.01 && a.y < b.y + b.height - 0.01 && b.y < a.y + a.height - 0.01
}

describe('layoutRepeater', () => {
  it('centres fixed items that fit', () => {
    const layer = repeater({})
    const { cells, overflow } = layoutRepeater(layer, layer.box, 3)
    expect(overflow).toBe(false)
    // 3 * 140 + 2 * 10 = 440 inside 460: 10 px either side
    expect(cells[0].x).toBeCloseTo(10)
    expect(cells[2].x + cells[2].width).toBeCloseTo(450)
  })

  it('scales four date circles down together to fit the row', () => {
    const layer = repeater({ overflow: 'scale', minScale: 0.6 })
    const { cells, overflow } = layoutRepeater(layer, layer.box, 4)
    expect(overflow).toBe(false)
    expect(cells[0].sx).toBeLessThan(1)
    expect(cells[0].width).toBeCloseTo(cells[0].height)
    const right = cells[3].x + cells[3].width
    expect(right).toBeLessThanOrEqual(460 + 0.01)
  })

  it('wraps extra pills into a second column without overlap', () => {
    const layer = repeater({
      direction: 'column',
      overflow: 'wrap',
      gap: 8,
      box: { x: 0, y: 0, width: 400, height: 200 },
      item: { width: 400, height: 42, layers: [] },
    })
    for (let count = 2; count <= 6; count++) {
      const { cells, overflow } = layoutRepeater(layer, layer.box, count)
      expect(cells).toHaveLength(count)
      expect(overflow).toBe(false)
      for (let i = 0; i < cells.length; i++) {
        expect(cells[i].y + cells[i].height).toBeLessThanOrEqual(200 + 0.01)
        for (let j = i + 1; j < cells.length; j++) expect(overlaps(cells[i], cells[j])).toBe(false)
      }
    }
    const five = layoutRepeater(layer, layer.box, 5).cells
    expect(new Set(five.map((c) => c.x)).size).toBe(2)
    expect(five[0].fontScale).toBe(1)
  })

  it('shares the strip evenly between photos and caps the count', () => {
    const layer = repeater({
      direction: 'column',
      sizing: 'fill',
      gap: 12,
      maxVisible: 4,
      box: { x: 0, y: 0, width: 148, height: 1302 },
      item: { width: 148, height: 100, layers: [] },
    })
    const { cells } = layoutRepeater(layer, layer.box, 6)
    expect(cells).toHaveLength(4)
    expect(cells[0].height).toBeCloseTo((1302 - 36) / 4)
    expect(cells[3].y + cells[3].height).toBeCloseTo(1302)
  })

  it('draws nothing for an empty list', () => {
    expect(layoutRepeater(repeater({}), repeater({}).box, 0).cells).toEqual([])
  })
})

describe('coverRect', () => {
  it('covers the slot and keeps the focus centred when possible', () => {
    const rect = coverRect({ width: 3000, height: 4000 }, { width: 430, height: 1350 }, { focusX: 0.5, focusY: 0.5, zoom: 1 })
    expect(rect.height).toBeCloseTo(1350)
    expect(rect.width).toBeCloseTo(1012.5)
    expect(rect.x).toBeCloseTo(215 - 506.25)
    expect(rect.y).toBe(0)
  })

  it('clamps so the image edge never shows', () => {
    const rect = coverRect({ width: 3000, height: 4000 }, { width: 430, height: 1350 }, { focusX: 0, focusY: 0, zoom: 1 })
    expect(rect.x).toBe(0)
    const far = coverRect({ width: 3000, height: 4000 }, { width: 430, height: 1350 }, { focusX: 1, focusY: 1, zoom: 1 })
    expect(far.x + far.width).toBeCloseTo(430)
  })

  it('inverts cleanly for panning', () => {
    const image = { width: 3000, height: 4000 }
    const slot = { width: 430, height: 1350 }
    const placement = { focusX: 0.3, focusY: 0.5, zoom: 1.5 }
    const rect = coverRect(image, slot, placement)
    const focus = focusForOffset(image, slot, 1.5, rect.x, rect.y)
    const again = coverRect(image, slot, { ...focus, zoom: 1.5 })
    expect(again.x).toBeCloseTo(rect.x)
    expect(again.y).toBeCloseTo(rect.y)
  })
})

describe('defaultFocus', () => {
  it('centres on the subject, a little high', () => {
    expect(defaultFocus({ source: 'pose', subject: { x: 0.2, y: 0.1, w: 0.4, h: 0.8 } })).toEqual({
      focusX: 0.4,
      focusY: 0.1 + 0.8 * 0.45,
    })
  })

  it('uses the head for headshots', () => {
    const focus = defaultFocus({ source: 'pose', head: { x: 0.6, y: 0.3 } }, { shotTypes: ['headshot'] })
    expect(focus.focusX).toBe(0.6)
    expect(focus.focusY).toBeCloseTo(0.38)
  })

  it('falls back to just above centre', () => {
    expect(defaultFocus(null)).toEqual({ focusX: 0.5, focusY: 0.42 })
  })
})
