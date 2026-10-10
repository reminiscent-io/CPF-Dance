import { describe, it, expect } from 'vitest'
import { pickSeriesFields, seriesPositions, seriesLabel } from '@/lib/class-series'

describe('pickSeriesFields', () => {
  it('keeps shared fields and drops per-day ones', () => {
    const picked = pickSeriesFields({
      title: 'Contemporary Intensive',
      cost_per_person: 0,
      description: null,
      start_time: '2026-11-06T15:00:00.000Z',
      end_time: '2026-11-06T18:00:00.000Z',
      is_cancelled: true,
      actual_attendance_count: 12,
      is_virtual: true,
    })
    expect(picked).toEqual({ title: 'Contemporary Intensive', cost_per_person: 0, description: null })
  })
})

describe('seriesPositions', () => {
  it('numbers each series by start time and skips singletons', () => {
    const positions = seriesPositions([
      { id: 'sun', series_id: 'w', start_time: '2026-11-08T15:00:00Z' },
      { id: 'fri', series_id: 'w', start_time: '2026-11-06T22:00:00Z' },
      { id: 'sat', series_id: 'w', start_time: '2026-11-07T15:00:00Z' },
      { id: 'solo', series_id: 'lonely', start_time: '2026-11-07T15:00:00Z' },
      { id: 'plain', series_id: null, start_time: '2026-11-07T15:00:00Z' },
    ])
    expect(positions.get('fri')).toEqual({ series_position: 1, series_total: 3 })
    expect(positions.get('sat')).toEqual({ series_position: 2, series_total: 3 })
    expect(positions.get('sun')).toEqual({ series_position: 3, series_total: 3 })
    expect(positions.has('solo')).toBe(false)
    expect(positions.has('plain')).toBe(false)
  })
})

describe('seriesLabel', () => {
  it('says "Day" only for workshops', () => {
    expect(seriesLabel('workshop', { series_position: 2, series_total: 3 })).toBe('Day 2 of 3')
    expect(seriesLabel('group', { series_position: 2, series_total: 12 })).toBe('2 of 12')
  })
})
