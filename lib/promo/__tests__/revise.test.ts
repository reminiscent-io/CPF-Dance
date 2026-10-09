import { describe, expect, it } from 'vitest'
import { zodTextFormat } from 'openai/helpers/zod'
import { applyRevision, buildReviseSchema, namesSlot, reviseInput, type ReviseContext } from '../ai/revise'
import { DEFAULT_BRAND_TOKENS } from '../brand'
import { exampleDocument, placementFor, setSlotValue } from '../document'
import { buildPrecisionWorkshopDefinition, PRECISION_WORKSHOP_SLOTS } from '../templates/precision-workshop'

const definition = buildPrecisionWorkshopDefinition()
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const photos = [1, 2, 3].map((n) => ({ id: id(n), tags: { description: `Photo ${n}` } }))
const copy = { bannedWords: DEFAULT_BRAND_TOKENS.voice.bannedWords, sessionCount: 3 }

function context(instruction: string, edited: string[] = []): ReviseContext {
  let document = exampleDocument(definition)
  document = {
    ...document,
    photos: { hero: [placementFor(photos[0])], strip: [placementFor(photos[1])] },
  }
  for (const slot of edited) {
    document = setSlotValue(document, slot, slot === 'tagline' ? 'Her own words.' : 'Mine', { byHand: true })
  }
  return { definition, brand: DEFAULT_BRAND_TOKENS, document, instruction, photos }
}

describe('revise schema', () => {
  it('converts to a strict schema of allowed operations', () => {
    const format = zodTextFormat(buildReviseSchema(definition, photos.map((p) => p.id)), 'promo_revision')
    expect(format.strict).toBe(true)
    expect(JSON.stringify(format.schema)).toContain('set_photo_look')
  })
})

describe('applyRevision', () => {
  it('makes it more dramatic without touching what she wrote (AC5)', () => {
    const ctx = context('make it more dramatic', ['tagline'])
    const before = JSON.stringify(ctx.document.values.tagline)
    const outcome = applyRevision(
      ctx,
      [
        { op: 'set_variant', variant: 'noir' },
        { op: 'set_photo_look', slot: 'hero', look: 'dramatic' },
        { op: 'set_copy', slot: 'tagline', value: 'Darker. Sharper.' },
        { op: 'set_copy', slot: 'description', value: 'Train with intent and leave with lines that read from the back row.' },
      ],
      copy
    )
    expect(outcome.document.variant).toBe('noir')
    expect(outcome.document.photos.hero[0].look).toBe('dramatic')
    expect(JSON.stringify(outcome.document.values.tagline)).toBe(before)
    expect(outcome.skipped.map((s) => s.op)).toEqual(['set_copy'])
    expect(outcome.document.values.description).toMatch(/back row/)
    expect(outcome.document.edited).toEqual(['tagline'])
  })

  it('rewrites a locked slot when the instruction names it', () => {
    const ctx = context('make the tagline punchier', ['tagline'])
    const outcome = applyRevision(ctx, [{ op: 'set_copy', slot: 'tagline', value: 'Clean. Fast. Exact.' }], copy)
    expect(outcome.document.values.tagline).toBe('Clean. Fast. Exact.')
  })

  it('drops copy that breaks the fact guard and photos she didn’t pick', () => {
    const outcome = applyRevision(
      context('add urgency'),
      [
        { op: 'set_list', slot: 'pills', items: ['Nov 14 only', 'Turns'] },
        { op: 'assign_photo', slot: 'hero', index: 0, photo: id(9) },
        { op: 'assign_photo', slot: 'strip', index: 1, photo: id(3) },
      ],
      copy
    )
    expect(outcome.skipped).toHaveLength(2)
    expect(outcome.document.photos.strip.map((p) => p.assetId)).toEqual([id(2), id(3)])
  })

  it('swaps photos within and across slots, keeping each spot’s look', () => {
    const ctx = context('swap the hero with the first strip photo')
    ctx.document.photos.hero[0].look = 'warm'
    const outcome = applyRevision(ctx, [{ op: 'swap_photos', a_slot: 'hero', a_index: 0, b_slot: 'strip', b_index: 0 }], copy)
    expect(outcome.document.photos.hero[0]).toMatchObject({ assetId: id(2), look: 'warm' })
    expect(outcome.document.photos.strip[0].assetId).toBe(id(1))
  })
})

describe('slot naming', () => {
  const slot = (slotId: string) => PRECISION_WORKSHOP_SLOTS.find((item) => item.id === slotId)!
  it('matches labels and aliases as whole words', () => {
    expect(namesSlot('Make the subtitle shorter', slot('tagline'))).toBe(true)
    expect(namesSlot('Change the gold line to Intensive', slot('title_accent'))).toBe(true)
    expect(namesSlot('more dramatic please', slot('tagline'))).toBe(false)
    expect(namesSlot('relisting things', slot('pills'))).toBe(false)
  })

  it('marks locked slots in the summary the model reads', () => {
    expect(reviseInput(context('x', ['tagline']))).toMatch(/tagline \(Tagline;.*\) LOCKED: "Her own words\."/)
  })
})
