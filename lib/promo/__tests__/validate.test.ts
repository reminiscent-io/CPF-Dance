import { describe, expect, it } from 'vitest'
import { copyProblems, photoProblems, slotProblems } from '../ai/validate'
import { PRECISION_WORKSHOP_SLOTS } from '../templates/precision-workshop'

const context = { bannedWords: ['unleash', 'journey'], sessionCount: 3 }
const slot = (id: string) => PRECISION_WORKSHOP_SLOTS.find((item) => item.id === id)!

describe('fact guard', () => {
  it('rejects a pill that states a date', () => {
    expect(copyProblems('Pill', 'Nov 14 only', context).join(' ')).toMatch(/digits|months/)
    expect(copyProblems('Pill', 'Saturday intensive', context)).toHaveLength(1)
  })

  it('rejects prices, times and exclamation points', () => {
    expect(copyProblems('Tagline', 'Only $40', context).length).toBeGreaterThan(0)
    expect(copyProblems('Tagline', 'Starts at noon', context)).toHaveLength(1)
    expect(copyProblems('Tagline', 'Kick higher!', context)).toHaveLength(1)
  })

  it('lets a day count stand only when it matches the schedule', () => {
    expect(copyProblems('Description', 'An intensive three-day workshop', context)).toEqual([])
    expect(copyProblems('Description', 'An intensive two-day workshop', { ...context, sessionCount: 3 })).toHaveLength(1)
    expect(copyProblems('Description', 'Two weeks of drills', context)).toEqual([])
  })

  it('leaves ordinary words alone', () => {
    expect(copyProblems('Tagline', 'You may feel the burn', context)).toEqual([])
    expect(copyProblems('Tagline', 'March to the beat', context)).toHaveLength(1)
    expect(copyProblems('Description', 'Sharp lines and sun-warmed muscles', context)).toEqual([])
  })

  it('catches banned words from the voice notes', () => {
    expect(copyProblems('Tagline', 'Unleash your extension', context)).toEqual(['Tagline: don’t use the word "unleash".'])
  })
})

describe('slot rules', () => {
  it('enforces character limits and list counts', () => {
    expect(slotProblems(slot('tagline'), 'Sharpen every single line you dance tonight', context)[0]).toMatch(/keep it to 28/)
    expect(slotProblems(slot('pills'), ['Turns'], context)[0]).toMatch(/2 to 6 items/)
    expect(slotProblems(slot('pills'), ['Turns', 'turns'], context).join(' ')).toMatch(/appears twice/)
    expect(slotProblems(slot('keywords'), ['Precision', 'Strength', 'Styling'], context)).toEqual([])
  })
})

describe('photo choices', () => {
  it('only allows her selected photos, once each', () => {
    const allowed = ['a', 'b', 'c']
    expect(photoProblems('Strip', ['b', 'c'], allowed, { max: 4, exclude: ['a'] })).toEqual([])
    expect(photoProblems('Strip', ['a'], allowed, { max: 4, exclude: ['a'] })).toEqual(['Strip: use each photo once.'])
    expect(photoProblems('Hero', ['z'], allowed, { max: 1 })[0]).toMatch(/isn’t one of/)
  })
})
