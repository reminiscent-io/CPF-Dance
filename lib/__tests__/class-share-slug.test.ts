import { describe, expect, it } from 'vitest'
import { buildShareSlug, claimShareSlug, isClassId, slugifyDate, slugifyTitle } from '../class-share-slug'

describe('slugifyTitle', () => {
  it.each([
    ['Precision Workshop', 'precision-workshop'],
    ['Pointe & Partnering: Level II', 'pointe-partnering-level-ii'],
    ['  Café Jazz — Adv.  ', 'cafe-jazz-adv'],
    ["Courtney's Summer Intensive 2026", 'courtney-s-summer-intensive-2026'],
  ])('%j -> %j', (title, slug) => {
    expect(slugifyTitle(title)).toBe(slug)
  })

  it('falls back to "class" when nothing is left', () => {
    expect(slugifyTitle('💃✨')).toBe('class')
    expect(slugifyTitle('')).toBe('class')
  })

  it('cuts a long title at a word boundary', () => {
    const slug = slugifyTitle('An Extremely Long Workshop Title That Goes On And On About Contemporary Technique')
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
    expect('an-extremely-long-workshop-title-that-goes-on-and-on-about-contemporary-technique'.startsWith(slug)).toBe(true)
  })
})

describe('slugifyDate', () => {
  it('uses the Eastern calendar day', () => {
    // 11pm ET on Oct 18 is already Oct 19 in UTC
    expect(slugifyDate('2026-10-19T03:00:00Z')).toBe('oct-18-2026')
    expect(slugifyDate('2026-03-07T15:00:00Z')).toBe('mar-7-2026')
  })
})

describe('buildShareSlug', () => {
  it('joins the title and the first day', () => {
    expect(buildShareSlug('Precision Workshop', '2026-10-18T22:00:00Z')).toBe('precision-workshop-oct-18-2026')
  })
})

describe('isClassId', () => {
  it('tells an id from a slug', () => {
    expect(isClassId('33333333-3333-4333-8333-333333333333')).toBe(true)
    expect(isClassId('precision-workshop-oct-18-2026')).toBe(false)
  })
})

describe('claimShareSlug', () => {
  const claimer = (taken: string[]) => {
    const tried: string[] = []
    const tryClaim = async (slug: string) => {
      tried.push(slug)
      return taken.includes(slug) ? ('taken' as const) : ('claimed' as const)
    }
    return { tried, tryClaim }
  }

  it('takes the plain slug when it is free', async () => {
    const { tried, tryClaim } = claimer([])
    expect(await claimShareSlug('ballet-oct-18-2026', tryClaim)).toBe('ballet-oct-18-2026')
    expect(tried).toEqual(['ballet-oct-18-2026'])
  })

  it('numbers an identical class on the same day', async () => {
    const { tried, tryClaim } = claimer(['ballet-oct-18-2026', 'ballet-oct-18-2026-2'])
    expect(await claimShareSlug('ballet-oct-18-2026', tryClaim)).toBe('ballet-oct-18-2026-3')
    expect(tried).toEqual(['ballet-oct-18-2026', 'ballet-oct-18-2026-2', 'ballet-oct-18-2026-3'])
  })

  it('gives up rather than looping forever', async () => {
    await expect(claimShareSlug('ballet', async () => 'taken')).rejects.toThrow(/No free share slug/)
  })

  it('passes write errors through', async () => {
    await expect(claimShareSlug('ballet', async () => { throw new Error('db down') })).rejects.toThrow('db down')
  })
})
