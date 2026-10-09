import { describe, expect, it } from 'vitest'
import { checkTemplateIntegrity } from '../schema'
import { buildScene } from '../layout/scene'
import type { MeasureText } from '../layout/text'
import { DEFAULT_BRAND_TOKENS } from '../brand'
import { buildPrecisionWorkshopDefinition } from '../templates/precision-workshop'
import {
  addLayer,
  duplicateLayer,
  moveLayer,
  padToLength,
  removeLayer,
  setLayerBox,
  stressDocument,
  updateSlot,
} from '../template-edits'

const canvasMeasureStub: MeasureText = (text, font) => text.length * font.size * 0.6
const definition = buildPrecisionWorkshopDefinition()
const post = () => definition.formats.ig_post!

describe('template edits', () => {
  it('moves the date row without touching other formats (AC7)', () => {
    const sessions = post().layers.find((layer) => layer.id === 'sessions')!
    const next = setLayerBox(definition, 'ig_post', 'sessions', { ...sessions.box, y: sessions.box.y + 30.2 })
    expect(next.formats.ig_post!.layers.find((layer) => layer.id === 'sessions')!.box.y).toBe(sessions.box.y + 30)
    expect(next.formats.ig_story).toBe(definition.formats.ig_story)
    expect(definition.formats.ig_post!.layers.find((layer) => layer.id === 'sessions')!.box.y).toBe(sessions.box.y)
  })

  it('raises the feature list’s default count (AC7)', () => {
    const next = updateSlot(definition, 'pills', (slot) => ({ ...slot, list: { ...slot.list!, target: 5 } }))
    expect(next.slots.find((slot) => slot.id === 'pills')!.list!.target).toBe(5)
    expect(checkTemplateIntegrity(next)).toEqual([])
  })

  it('reorders, duplicates, adds and removes layers with unique ids', () => {
    const ids = (d: typeof definition) => d.formats.ig_post!.layers.map((layer) => layer.id)
    const before = ids(definition)
    const moved = moveLayer(definition, 'ig_post', before[1], -1)
    expect(ids(moved).slice(0, 2)).toEqual([before[1], before[0]])
    const { definition: copied, id } = duplicateLayer(definition, 'ig_post', 'tagline')
    expect(id).toBe('tagline_2')
    expect(ids(copied)).toContain('tagline_2')
    const { definition: added, id: textId } = addLayer(copied, 'ig_post', 'text')
    expect(ids(added).at(-1)).toBe(textId)
    expect(checkTemplateIntegrity(added)).toEqual([])
    expect(ids(removeLayer(added, 'ig_post', 'tagline_2'))).not.toContain('tagline_2')
  })
})

describe('stress preview', () => {
  it('pads copy to its limit on a word boundary', () => {
    expect(padToLength('Three days. One focus.', 28).length).toBeLessThanOrEqual(28)
    expect(padToLength('Three days. One focus.', 28).length).toBeGreaterThan(22)
  })

  it('builds the longest, fullest version of every format without crashing', () => {
    for (const format of ['ig_post', 'ig_story', 'poster'] as const) {
      const document = stressDocument(definition, { sessions: 4, lists: 'most', longest: true, variant: 'noir' })
      expect(document.values.sessions).toHaveLength(4)
      expect(document.values.pills).toHaveLength(6)
      const scene = buildScene({ definition, format, document, brand: DEFAULT_BRAND_TOKENS, measure: canvasMeasureStub, assets: {} })
      expect(scene.nodes.length).toBeGreaterThan(10)
    }
  })

  it('shows the fewest items too', () => {
    const document = stressDocument(definition, { sessions: 1, lists: 'fewest', longest: false, variant: 'ivory' })
    expect(document.values.pills).toHaveLength(2)
    expect(document.values.keywords).toHaveLength(3)
  })
})
