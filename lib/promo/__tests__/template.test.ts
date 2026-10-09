import { describe, expect, it } from 'vitest'
import { DEFAULT_BRAND_TOKENS } from '../brand'
import { emptyDocument, exampleDocument, factValues, documentForSibling, normalizeDocument } from '../document'
import { buildScene, fontsForLayout, type SceneNode } from '../layout/scene'
import type { MeasureText } from '../layout/text'
import { checkTemplateIntegrity, DesignDocumentSchema, TemplateDefinitionSchema } from '../schema'
import { buildPrecisionWorkshopDefinition } from '../templates/precision-workshop'
import type { DesignDocument, Layer, PromoFormat, SessionValue } from '../types'

const measure: MeasureText = (text, font) => text.length * font.size * 0.55
const definition = buildPrecisionWorkshopDefinition()
const formats: PromoFormat[] = ['ig_post', 'ig_story', 'poster']

function flatten(layers: Layer[]): Layer[] {
  return layers.flatMap((layer) => (layer.kind === 'repeater' ? [layer, ...flatten(layer.item.layers)] : [layer]))
}

describe('Precision Workshop template', () => {
  it('passes the schema and the integrity checks', () => {
    expect(() => TemplateDefinitionSchema.parse(definition)).not.toThrow()
    expect(checkTemplateIntegrity(definition)).toEqual([])
  })

  it.each(formats)('keeps every top-level layer on the %s canvas', (format) => {
    const layout = definition.formats[format]!
    for (const layer of layout.layers) {
      expect(layer.box.x).toBeGreaterThanOrEqual(-0.01)
      expect(layer.box.y).toBeGreaterThanOrEqual(-0.01)
      expect(layer.box.x + layer.box.width).toBeLessThanOrEqual(layout.width + 0.01)
      expect(layer.box.y + layer.box.height).toBeLessThanOrEqual(layout.height + 0.01)
    }
  })

  it('keeps story text between y = 250 and y = 1670', () => {
    const layout = definition.formats.ig_story!
    for (const layer of layout.layers) {
      if (layer.kind !== 'text' && !(layer.kind === 'repeater' && layer.item.layers.some((l) => l.kind === 'text'))) continue
      expect(layer.box.y).toBeGreaterThanOrEqual(250)
      expect(layer.box.y + layer.box.height).toBeLessThanOrEqual(1670)
    }
  })

  it('references only color tokens and font roles', () => {
    const json = JSON.stringify(definition)
    expect(json).not.toMatch(/#[0-9a-f]{3,6}\b/i)
    for (const format of formats) {
      for (const layer of flatten(definition.formats[format]!.layers)) {
        if (layer.kind === 'text') expect(['display', 'caps', 'script']).toContain(layer.style.font)
      }
    }
  })

  it('needs a small, fixed set of font faces', () => {
    const faces = fontsForLayout(definition.formats.ig_post!, DEFAULT_BRAND_TOKENS)
    expect(faces.length).toBeGreaterThan(2)
    expect(faces.every((face) => face.family.startsWith('Promo '))).toBe(true)
  })
})

describe('buildScene', () => {
  const example = exampleDocument(definition)

  it.each(formats)('lays out the reference copy on %s without overflow', (format) => {
    const scene = buildScene({ definition, format, document: example, brand: DEFAULT_BRAND_TOKENS, measure, assets: {} })
    expect(scene.warnings.filter((w) => w.message.includes("doesn't fit"))).toEqual([])
    const circles = scene.nodes.filter((n) => n.type === 'ellipse')
    expect(circles).toHaveLength(3)
    expect(scene.nodes.some((n) => n.type === 'text' && n.text === 'PRECISION')).toBe(true)
  })

  it('draws rules either side of the level line', () => {
    const scene = buildScene({ definition, format: 'ig_post', document: example, brand: DEFAULT_BRAND_TOKENS, measure, assets: {} })
    const rules = scene.nodes.filter((n) => n.key.startsWith('level:rule'))
    expect(rules).toHaveLength(2)
  })

  it('handles one to four dates and two to six pills without overlapping cells', () => {
    const session: SessionValue = { weekday: 'Sat', date: 'Nov 14', time: '11:00 AM – 1:00 PM' }
    for (let dates = 1; dates <= 4; dates++) {
      for (let pills = 2; pills <= 6; pills++) {
        const document: DesignDocument = {
          ...example,
          values: {
            ...example.values,
            sessions: Array.from({ length: dates }, () => session),
            pills: Array.from({ length: pills }, (_, i) => `Feature number ${i + 1}`),
          },
        }
        const scene = buildScene({ definition, format: 'ig_post', document, brand: DEFAULT_BRAND_TOKENS, measure, assets: {} })
        const circles = scene.nodes.filter((n) => n.type === 'ellipse') as Extract<SceneNode, { type: 'ellipse' }>[]
        expect(circles).toHaveLength(dates)
        const pillRects = scene.nodes.filter(
          (n) => n.type === 'rect' && n.rootLayerId === 'pills'
        ) as Extract<SceneNode, { type: 'rect' }>[]
        expect(pillRects).toHaveLength(pills)
        const boxes = [...circles, ...pillRects]
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]
            const b = boxes[j]
            const overlap =
              a.x < b.x + b.width - 0.01 && b.x < a.x + a.width - 0.01 && a.y < b.y + b.height - 0.01 && b.y < a.y + a.height - 0.01
            expect(overlap).toBe(false)
          }
        }
        expect(scene.warnings.filter((w) => w.message.includes('more items than fit'))).toEqual([])
      }
    }
  })

  it('switches palette with the Noir variant', () => {
    const ivory = buildScene({ definition, format: 'ig_post', document: example, brand: DEFAULT_BRAND_TOKENS, measure, assets: {} })
    const noir = buildScene({
      definition,
      format: 'ig_post',
      document: { ...example, variant: 'noir' },
      brand: DEFAULT_BRAND_TOKENS,
      measure,
      assets: {},
    })
    expect(ivory.background).toBe(DEFAULT_BRAND_TOKENS.colors.paper)
    expect(noir.background).toBe(DEFAULT_BRAND_TOKENS.colors.darkBlock)
  })

  it('hides an empty location line', () => {
    const scene = buildScene({ definition, format: 'ig_post', document: example, brand: DEFAULT_BRAND_TOKENS, measure, assets: {} })
    expect(scene.nodes.some((n) => n.layerId === 'location')).toBe(false)
  })

  it('falls back to the brand kit for brand slots', () => {
    const scene = buildScene({
      definition,
      format: 'ig_post',
      document: emptyDocument(definition),
      brand: DEFAULT_BRAND_TOKENS,
      measure,
      assets: {},
    })
    expect(scene.nodes.some((n) => n.type === 'text' && n.text === 'COURTNEY FILE')).toBe(true)
  })

  it('places photos with a cover crop and flags missing ones', () => {
    const document: DesignDocument = {
      ...example,
      photos: {
        hero: [{ assetId: 'a1', focusX: 0.5, focusY: 0.5, zoom: 1 }],
        strip: [
          { assetId: 'a2', focusX: 0.5, focusY: 0.5, zoom: 1 },
          { assetId: 'gone', focusX: 0.5, focusY: 0.5, zoom: 1 },
        ],
      },
    }
    const scene = buildScene({
      definition,
      format: 'ig_post',
      document,
      brand: DEFAULT_BRAND_TOKENS,
      measure,
      assets: { a1: { width: 3000, height: 4000 }, a2: { width: 2000, height: 2000 } },
    })
    const photos = scene.nodes.filter((n) => n.type === 'photo') as Extract<SceneNode, { type: 'photo' }>[]
    expect(photos).toHaveLength(3)
    expect(photos[0].draw?.height).toBeCloseTo(1350)
    expect(photos[2].assetId).toBeUndefined()
    expect(scene.warnings.some((w) => w.message.includes('no longer in the library'))).toBe(true)
  })

  it('returns frozen layouts that reproduce the same lines', () => {
    const first = buildScene({ definition, format: 'ig_post', document: example, brand: DEFAULT_BRAND_TOKENS, measure, assets: {} })
    // A different "device" that measures 10% wider must still draw the stored lines.
    const wider: MeasureText = (text, font) => measure(text, font) * 1.1
    const second = buildScene({
      definition,
      format: 'ig_post',
      document: { ...example, layout: first.textLayout },
      brand: DEFAULT_BRAND_TOKENS,
      measure: wider,
      assets: {},
    })
    const lines = (scene: typeof first) =>
      scene.nodes.filter((n) => n.type === 'text').map((n) => (n as Extract<SceneNode, { type: 'text' }>).lines)
    expect(lines(second)).toEqual(lines(first))
  })
})

describe('documents', () => {
  it('fills fact slots from the brief', () => {
    const values = factValues(definition, {
      sessions: [
        { date: '2026-11-14', start: '11:00', end: '13:00' },
        { date: '2026-11-13', start: '17:00', end: '19:00' },
      ],
      level: 'all',
      levelText: '',
      location: ' Steps on Broadway ',
      price: '',
    })
    expect(values.sessions).toEqual([
      { weekday: 'Fri', date: 'Nov 13', time: '5:00–7:00 PM' },
      { weekday: 'Sat', date: 'Nov 14', time: '11:00 AM – 1:00 PM' },
    ])
    expect(values.level).toBe('All levels welcome')
    expect(values.location).toBe('Steps on Broadway')
  })

  it('validates with the document schema', () => {
    expect(() => DesignDocumentSchema.parse(exampleDocument(definition))).not.toThrow()
  })

  it('drops nudges and frozen layout when copied to another format', () => {
    const document: DesignDocument = {
      ...exampleDocument(definition),
      nudges: { sessions: { y: 500 } },
      layout: { title_primary: { hash: 'x', size: 10, lines: ['A'] } },
      edited: ['tagline'],
    }
    const sibling = documentForSibling(document)
    expect(sibling.nudges).toEqual({})
    expect(sibling.layout).toEqual({})
    expect(sibling.edited).toEqual(['tagline'])
    expect(sibling.values).toEqual(document.values)
  })

  it('drops values for slots a template no longer has', () => {
    const document: DesignDocument = { ...emptyDocument(definition), values: { gone: 'x', tagline: 'Stay' }, edited: ['gone'] }
    const normalized = normalizeDocument(document, definition)
    expect(normalized.values).toEqual({ tagline: 'Stay' })
    expect(normalized.edited).toEqual([])
  })
})
