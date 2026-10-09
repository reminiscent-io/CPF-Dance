import { describe, expect, it } from 'vitest'
import {
  clearNudge,
  clearSlotValue,
  movePlacement,
  removePlacement,
  setNudge,
  setPlacement,
  setSlotLook,
  setSlotValue,
  swapPlacements,
} from '../document'
import type { DesignDocument, PhotoPlacement } from '../types'

const photo = (id: string, look?: PhotoPlacement['look']): PhotoPlacement => ({
  assetId: `00000000-0000-4000-8000-00000000000${id}`,
  focusX: 0.5,
  focusY: 0.4,
  zoom: 1,
  look,
})

const doc: DesignDocument = {
  v: 1,
  variant: 'ivory',
  values: { led_by: 'Taught by' },
  photos: { hero: [photo('1', 'dramatic')], strip: [photo('2'), photo('3'), photo('4')] },
  edited: ['led_by'],
  nudges: {},
  layout: {},
}

describe('document edits', () => {
  it('swaps a strip photo into the hero, keeping each slot’s look', () => {
    const next = swapPlacements(doc, { slotId: 'hero', index: 0 }, { slotId: 'strip', index: 1 })
    expect(next.photos.hero[0].assetId).toBe(photo('3').assetId)
    expect(next.photos.hero[0].look).toBe('dramatic')
    expect(next.photos.strip[1].assetId).toBe(photo('1').assetId)
    expect(next.photos.strip[1].look).toBeUndefined()
    expect(next.edited).toEqual(['led_by', 'hero', 'strip'])
  })

  it('reorders, removes and replaces strip photos', () => {
    expect(movePlacement(doc, 'strip', 0, 2).photos.strip.map((p) => p.assetId.slice(-1))).toEqual(['3', '4', '2'])
    expect(removePlacement(doc, 'strip', 1).photos.strip).toHaveLength(2)
    expect(setPlacement(doc, 'strip', 3, photo('5')).photos.strip).toHaveLength(4)
    expect(movePlacement(doc, 'strip', 0, 9)).toBe(doc)
  })

  it('applies a look to every photo in a slot', () => {
    expect(setSlotLook(doc, 'strip', 'warm').photos.strip.every((p) => p.look === 'warm')).toBe(true)
    expect(setSlotLook(doc, 'missing', 'warm')).toBe(doc)
  })

  it('resets a brand line to the brand kit and unlocks it', () => {
    const next = clearSlotValue(doc, 'led_by')
    expect(next.values).toEqual({})
    expect(next.edited).toEqual([])
    expect(clearSlotValue(next, 'led_by')).toBe(next)
  })

  it('stores moves on half-unit steps and clears them', () => {
    const moved = setNudge(doc, 'tagline', { x: 10.26, y: 20.74, width: 300, height: 40 })
    expect(moved.nudges.tagline).toEqual({ x: 10.5, y: 20.5, width: 300, height: 40 })
    expect(clearNudge(moved, 'tagline').nudges).toEqual({})
    expect(clearNudge(setNudge(moved, 'title', { x: 0, y: 0, width: 1, height: 1 })).nudges).toEqual({})
  })

  it('locks a slot she typed in', () => {
    expect(setSlotValue(doc, 'tagline', 'New', { byHand: true }).edited).toContain('tagline')
    expect(setSlotValue(doc, 'tagline', 'New', { byHand: false }).edited).not.toContain('tagline')
  })
})
