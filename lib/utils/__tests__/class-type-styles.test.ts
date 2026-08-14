import { describe, it, expect } from 'vitest'
import {
  getClassTypeStyle,
  getClassTypeLabel,
  CANCELLED_BLOCK_STYLE,
  type ClassType,
} from '@/lib/utils/class-type-styles'

const ALL_TYPES: ClassType[] = [
  'private',
  'group',
  'workshop',
  'master_class',
  'competition_choreography',
  'personal',
]

const NON_PRIVATE = ALL_TYPES.filter(t => t !== 'private')

describe('getClassTypeStyle', () => {
  it('gives private a block style no other type shares', () => {
    const privateBlock = getClassTypeStyle('private').block
    for (const type of NON_PRIVATE) {
      expect(getClassTypeStyle(type).block).not.toBe(privateBlock)
    }
  })

  it('collapses every non-private type onto one block style', () => {
    const blocks = new Set(NON_PRIVATE.map(t => getClassTypeStyle(t).block))
    expect(blocks.size).toBe(1)
  })

  it('paints private with the ballet-pink family and neutrals with champagne', () => {
    expect(getClassTypeStyle('private').block).toContain('bg-ballet-pink-100')
    expect(getClassTypeStyle('group').block).toContain('bg-champagne-100')
  })

  it('keeps the gilt chip on master class even though its block is neutral', () => {
    expect(getClassTypeStyle('master_class').chip).toContain('gold')
    expect(getClassTypeStyle('master_class').block).toBe(getClassTypeStyle('group').block)
  })

  it('marks private with a distinct dot', () => {
    expect(getClassTypeStyle('private').dot).toBe('bg-ballet-pink-500')
    for (const type of NON_PRIVATE) {
      expect(getClassTypeStyle(type).dot).toBe('bg-champagne-500')
    }
  })

  it('gives every known type a non-empty label and short label', () => {
    for (const type of ALL_TYPES) {
      expect(getClassTypeStyle(type).label.length).toBeGreaterThan(0)
      expect(getClassTypeStyle(type).shortLabel.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the neutral style for an unrecognised type', () => {
    const unknown = getClassTypeStyle('interpretive_mime')
    expect(unknown.block).toBe(getClassTypeStyle('group').block)
    expect(unknown.dot).toBe('bg-champagne-500')
  })

  it('echoes an unrecognised type back as its own label', () => {
    expect(getClassTypeStyle('interpretive_mime').label).toBe('interpretive_mime')
    expect(getClassTypeLabel('interpretive_mime')).toBe('interpretive_mime')
  })

  it('uses no off-system colour families', () => {
    const banned = /\b(purple|blue|green|amber|fuchsia|gray|slate|zinc)-/
    for (const type of [...ALL_TYPES, 'unknown']) {
      const style = getClassTypeStyle(type)
      expect(style.block).not.toMatch(banned)
      expect(style.chip).not.toMatch(banned)
      expect(style.dot).not.toMatch(banned)
    }
    expect(CANCELLED_BLOCK_STYLE).not.toMatch(banned)
  })
})

describe('getClassTypeLabel', () => {
  it('returns the long label for known types', () => {
    expect(getClassTypeLabel('private')).toBe('Private Lesson')
    expect(getClassTypeLabel('master_class')).toBe('Master Class')
  })
})
