import { describe, expect, it } from 'vitest'
import { zodTextFormat } from 'openai/helpers/zod'
import {
  ANGLES,
  buildVariationSchema,
  documentFromVariation,
  fallbackDocument,
  inputFor,
  instructionsFor,
  splitTitle,
  variationProblems,
  type GenerationPhoto,
  type Variation,
} from '../ai/generate'
import { DEFAULT_BRAND_TOKENS } from '../brand'
import { factValues } from '../document'
import { buildPrecisionWorkshopDefinition } from '../templates/precision-workshop'
import type { PromoBrief } from '../types'

const definition = buildPrecisionWorkshopDefinition()
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const photos: GenerationPhoto[] = [
  { id: id(1), width: 3000, height: 4000, tags: { orientation: 'portrait', shotTypes: ['headshot'] } },
  { id: id(2), width: 3000, height: 4000, tags: { orientation: 'portrait', shotTypes: ['full_body', 'kick'], description: 'High kick in black' } },
  { id: id(3), width: 4000, height: 3000, tags: { orientation: 'landscape', shotTypes: ['arms_up'] } },
]
const brief: PromoBrief = {
  format: 'ig_post',
  classIds: [],
  photoIds: photos.map((photo) => photo.id),
  classType: 'Workshop',
  titleIdea: 'Precision Workshop',
  focusPoints: 'Technique, Strength, Styling, Kicks',
  level: 'all',
  levelText: '',
  price: '$120',
  location: 'Broadway Dance Center',
  vibe: '',
  sessions: [
    { date: '2026-11-13', start: '17:00', end: '19:00' },
    { date: '2026-11-14', start: '11:00', end: '13:00' },
    { date: '2026-11-15', start: '11:00', end: '13:00' },
  ],
}
const context = { bannedWords: DEFAULT_BRAND_TOKENS.voice.bannedWords, sessionCount: 3 }

const good: Variation = {
  copy: {
    title_primary: 'Precision',
    title_accent: 'Workshop',
    tagline: 'Three days. One focus.',
    keywords: ['Technique', 'Strength', 'Styling', 'Kicks', 'Clean lines', 'Stamina'],
    description: 'Join for an intensive three-day workshop built to sharpen technique and raise your performance quality.',
    pills: ['Kick technique', 'Precision drills', 'Strength and stamina', 'Styling and performance'],
  },
  photos: { hero: id(2), strip: [id(1), id(3)] },
  variant: 'noir',
}

describe('generation schema', () => {
  it('converts to a strict JSON schema that only accepts her photo ids', () => {
    const format = zodTextFormat(buildVariationSchema(definition, brief.photoIds), 'promo_variation')
    const schema = format.schema as { properties: { photos: { properties: { hero: { enum: string[] } } } } }
    expect(format.strict).toBe(true)
    expect(schema.properties.photos.properties.hero.enum).toEqual(brief.photoIds)
  })

  it('states the facts as read-only context and the date count as a rule', () => {
    expect(instructionsFor(DEFAULT_BRAND_TOKENS, ANGLES[0], 3)).toContain('exactly 3')
    const input = inputFor(definition, brief, photos)
    expect(input).toContain('Fri Nov 13, 5:00–7:00 PM')
    expect(input).toContain(`${id(2)}: portrait; full body, kick; High kick in black`)
  })
})

describe('variation checks', () => {
  it('accepts a clean variation', () => {
    expect(variationProblems(definition, good, brief.photoIds, context)).toEqual([])
  })

  it('reports fact claims, reused photos and unknown variants', () => {
    const bad: Variation = {
      ...good,
      copy: { ...good.copy, pills: ['Nov 14 only', 'Turns'] },
      photos: { hero: id(2), strip: [id(2)] },
      variant: 'neon',
    }
    const problems = variationProblems(definition, bad, brief.photoIds, context).join('\n')
    expect(problems).toMatch(/Feature list item 1/)
    expect(problems).toMatch(/use each photo once/)
    expect(problems).toMatch(/variant/)
  })
})

describe('documents', () => {
  it('writes facts from the brief and copy from the model', () => {
    const facts = factValues(definition, brief)
    const document = documentFromVariation(definition, facts, good, photos)
    expect(document.values.sessions).toHaveLength(3)
    expect(document.values.price ?? document.values.location).toBeDefined()
    expect(document.values.tagline).toBe('Three days. One focus.')
    expect(document.photos.hero[0].assetId).toBe(id(2))
    expect(document.photos.strip.map((p) => p.assetId)).toEqual([id(1), id(3)])
    expect(document.variant).toBe('noir')
    expect(document.edited).toEqual([])
  })

  it('builds a usable fallback without the model', () => {
    const facts = factValues(definition, brief)
    const document = fallbackDocument(definition, { ...brief, sessions: brief.sessions.slice(0, 1) }, facts, photos, {
      ...context,
      sessionCount: 1,
    })
    expect(document.values.title_primary).toBe('Precision')
    expect(document.values.title_accent).toBe('Workshop')
    expect(document.values.keywords).toEqual(['Technique', 'Strength', 'Styling', 'Kicks'])
    // The template's sample description says "three-day", which a one-date class can't use.
    expect(document.values.description).toBeUndefined()
    expect(document.photos.hero[0].assetId).toBe(id(2))
  })

  it('splits title ideas into balanced lines', () => {
    expect(splitTitle('Precision Workshop')).toEqual(['Precision', 'Workshop'])
    expect(splitTitle('Turns and Leaps Clinic')).toEqual(['Turns and', 'Leaps Clinic'])
    expect(splitTitle('Intensive')).toEqual(['Intensive', ''])
  })
})
