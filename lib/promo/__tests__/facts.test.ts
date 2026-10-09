import { describe, expect, it } from 'vitest'
import {
  formatSession,
  formatSessions,
  formatTimeRange,
  levelPhrase,
  locationFromClass,
  priceFromClass,
  sessionsFromClasses,
  sharedClassTitle,
} from '../facts'

describe('formatTimeRange', () => {
  it('shares the period when both ends are PM, like the reference poster', () => {
    expect(formatTimeRange('17:00', '19:00')).toBe('5:00–7:00 PM')
  })

  it('names both periods when the range crosses noon', () => {
    expect(formatTimeRange('11:00', '13:00')).toBe('11:00 AM – 1:00 PM')
  })

  it('handles midnight and noon', () => {
    expect(formatTimeRange('00:30', '01:00')).toBe('12:30–1:00 AM')
    expect(formatTimeRange('12:00', '12:45')).toBe('12:00–12:45 PM')
  })

  it('shows a single time when the end is missing', () => {
    expect(formatTimeRange('09:15')).toBe('9:15 AM')
  })

  it('returns nothing for an unreadable time', () => {
    expect(formatTimeRange('25:00', '26:00')).toBe('')
  })
})

describe('formatSession', () => {
  it('formats weekday, date and time from the calendar date', () => {
    expect(formatSession({ date: '2026-11-13', start: '17:00', end: '19:00' })).toEqual({
      weekday: 'Fri',
      date: 'Nov 13',
      time: '5:00–7:00 PM',
    })
  })

  it('sorts sessions chronologically', () => {
    const formatted = formatSessions([
      { date: '2026-11-15', start: '11:00', end: '13:00' },
      { date: '2026-11-13', start: '17:00', end: '19:00' },
      { date: '2026-11-14', start: '11:00', end: '13:00' },
    ])
    expect(formatted.map((s) => s.weekday)).toEqual(['Fri', 'Sat', 'Sun'])
  })
})

describe('sessionsFromClasses', () => {
  it('converts UTC class times to studio time in winter (EST)', () => {
    const [session] = sessionsFromClasses([
      { start_time: '2026-11-13T22:00:00Z', end_time: '2026-11-14T00:00:00Z' },
    ])
    expect(session).toEqual({ date: '2026-11-13', start: '17:00', end: '19:00' })
  })

  it('converts UTC class times to studio time in summer (EDT)', () => {
    const [session] = sessionsFromClasses([
      { start_time: '2026-07-10T15:00:00Z', end_time: '2026-07-10T17:00:00Z' },
    ])
    expect(session).toEqual({ date: '2026-07-10', start: '11:00', end: '13:00' })
  })
})

describe('levelPhrase', () => {
  it('maps levels to the poster phrase', () => {
    expect(levelPhrase('all')).toBe('All levels welcome')
    expect(levelPhrase('advanced')).toBe('Advanced level')
  })

  it('uses her own wording for custom levels', () => {
    expect(levelPhrase('custom', '  Ages 15 and up ')).toBe('Ages 15 and up')
  })
})

describe('class facts', () => {
  it('prefers the studio name and city for location', () => {
    expect(locationFromClass({ location: 'Room B', studio: { name: 'Steps', city: 'New York' } })).toBe(
      'Steps, New York'
    )
    expect(locationFromClass({ location: ' Room B ' })).toBe('Room B')
  })

  it('prefills price from the pricing model', () => {
    expect(priceFromClass({ pricing_model: 'per_person', cost_per_person: '45.00' })).toBe('$45')
    expect(priceFromClass({ pricing_model: 'per_hour', cost_per_hour: 80 })).toBe('$80 per hour')
    expect(priceFromClass({ pricing_model: 'per_class', base_cost: 120.5 })).toBe('$120.50')
    expect(priceFromClass({ pricing_model: 'per_person', cost_per_person: null })).toBe('')
  })
})

describe('sharedClassTitle', () => {
  it('drops the per-day part of a multi-day workshop’s titles', () => {
    expect(sharedClassTitle(['Precision Workshop, day one', 'Precision Workshop, day two'])).toBe('Precision Workshop')
    expect(sharedClassTitle(['Kick Clinic – Part 1', 'Kick Clinic – Part 2'])).toBe('Kick Clinic')
  })

  it('falls back to the first title when nothing is shared', () => {
    expect(sharedClassTitle(['Turns', 'Leaps'])).toBe('Turns')
    expect(sharedClassTitle(['Jazz Technique'])).toBe('Jazz Technique')
    expect(sharedClassTitle([])).toBe('')
  })
})
