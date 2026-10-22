import { describe, it, expect } from 'vitest'
import { collapseWorkshops, upcomingListings, type OpenClass } from '@/lib/open-classes'

const base: OpenClass = {
  id: 'c1',
  title: 'Contemporary',
  description: null,
  location: null,
  start_time: '2026-11-06T22:00:00Z',
  end_time: '2026-11-06T23:30:00Z',
  class_type: 'group',
  series_id: null,
  max_capacity: null,
  pricing_model: 'per_person',
  cost_per_person: 25,
  base_cost: null,
  external_signup_url: null,
  workshop_price: null,
  workshop_signup_url: null,
  workshop_full_only: false,
  enrolled_count: 0,
  is_enrolled: false,
  studio: null,
  instructor: { full_name: 'Courtney' },
  asset: null,
}

const workshopDay = (id: string, start: string, extra: Partial<OpenClass> = {}): OpenClass => ({
  ...base,
  id,
  title: 'Precision Workshop',
  class_type: 'workshop',
  series_id: 'w',
  start_time: start,
  end_time: start,
  ...extra,
})

describe('collapseWorkshops', () => {
  it('folds a workshop into one card with every day', () => {
    const [card, solo] = collapseWorkshops([
      workshopDay('fri', '2026-11-06T22:00:00Z', { enrolled_count: 3, max_capacity: 20 }),
      workshopDay('sat', '2026-11-07T15:00:00Z', { enrolled_count: 5, max_capacity: 15 }),
      base,
    ])
    expect(card.days?.map(day => day.id)).toEqual(['fri', 'sat'])
    expect(card.enrolled_count).toBe(5)
    expect(card.max_capacity).toBe(15)
    expect(solo.id).toBe('c1')
  })

  it('counts her as enrolled only when she holds every day', () => {
    const partial = collapseWorkshops([
      workshopDay('fri', '2026-11-06T22:00:00Z', { is_enrolled: true }),
      workshopDay('sat', '2026-11-07T15:00:00Z'),
    ])[0]
    expect(partial.is_enrolled).toBe(false)
    expect(partial.days?.map(day => day.is_enrolled)).toEqual([true, false])

    const whole = collapseWorkshops([
      workshopDay('fri', '2026-11-06T22:00:00Z', { is_enrolled: true }),
      workshopDay('sat', '2026-11-07T15:00:00Z', { is_enrolled: true }),
    ])[0]
    expect(whole.is_enrolled).toBe(true)
  })
})

describe('upcomingListings', () => {
  it('drops classes that have started', () => {
    const listings = upcomingListings(
      [base, { ...base, id: 'later', start_time: '2026-11-10T22:00:00Z' }],
      new Date('2026-11-08T00:00:00Z')
    )
    expect(listings.map(cls => cls.id)).toEqual(['later'])
  })

  it('keeps enrolled classes so a shared link can say she already holds a spot', () => {
    const listings = upcomingListings([{ ...base, is_enrolled: true }], new Date('2026-11-01T00:00:00Z'))
    expect(listings).toHaveLength(1)
    expect(listings[0].is_enrolled).toBe(true)
  })
})
