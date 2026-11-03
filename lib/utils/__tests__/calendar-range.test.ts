import { describe, it, expect } from 'vitest'
import { getScheduleFetchRange, getVisibleDateRange } from '../calendar-range'

describe('getVisibleDateRange', () => {
  describe('week mode', () => {
    it('returns Sunday through Saturday for a midweek date', () => {
      // Wednesday, May 6, 2026
      const date = new Date(2026, 4, 6)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(4) // May
      expect(start.getDate()).toBe(3)  // Sunday
      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)

      expect(end.getFullYear()).toBe(2026)
      expect(end.getMonth()).toBe(4)
      expect(end.getDate()).toBe(9)    // Saturday
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
    })

    it('returns the same week when date is a Sunday', () => {
      // Sunday, May 3, 2026
      const date = new Date(2026, 4, 3)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getDate()).toBe(3) // Sunday
      expect(end.getDate()).toBe(9)   // Saturday
    })

    it('returns a range that spans April and May for a cross-month week', () => {
      // Tuesday, April 28, 2026 — week is Sun Apr 26 → Sat May 2
      const date = new Date(2026, 3, 28)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getMonth()).toBe(3) // April
      expect(start.getDate()).toBe(26)

      expect(end.getMonth()).toBe(4)   // May
      expect(end.getDate()).toBe(2)
    })

    it('returns a range that spans May and June for a Sunday at month end', () => {
      // Sunday, May 31, 2026 — week is May 31 → Sat Jun 6
      const date = new Date(2026, 4, 31)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getMonth()).toBe(4) // May
      expect(start.getDate()).toBe(31)

      expect(end.getMonth()).toBe(5)   // June
      expect(end.getDate()).toBe(6)
    })

    it('handles year boundary (Dec 31 → Jan)', () => {
      // Thursday, Dec 31, 2026 — week is Sun Dec 27 → Sat Jan 2, 2027
      const date = new Date(2026, 11, 31)
      const { start, end } = getVisibleDateRange(date, 'week')

      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(11)
      expect(start.getDate()).toBe(27)

      expect(end.getFullYear()).toBe(2027)
      expect(end.getMonth()).toBe(0)
      expect(end.getDate()).toBe(2)
    })
  })

  describe('month mode', () => {
    it('returns the first through last day of the month', () => {
      // Any day in May 2026
      const date = new Date(2026, 4, 15)
      const { start, end } = getVisibleDateRange(date, 'month')

      expect(start.getFullYear()).toBe(2026)
      expect(start.getMonth()).toBe(4)
      expect(start.getDate()).toBe(1)
      expect(start.getHours()).toBe(0)

      expect(end.getMonth()).toBe(4)
      expect(end.getDate()).toBe(31)
      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
    })

    it('handles February in a non-leap year (28 days)', () => {
      const date = new Date(2026, 1, 10) // Feb 10, 2026
      const { start, end } = getVisibleDateRange(date, 'month')

      expect(start.getDate()).toBe(1)
      expect(end.getDate()).toBe(28)
    })

    it('handles February in a leap year (29 days)', () => {
      const date = new Date(2028, 1, 10) // Feb 10, 2028 (leap)
      const { start, end } = getVisibleDateRange(date, 'month')

      expect(start.getDate()).toBe(1)
      expect(end.getDate()).toBe(29)
    })
  })
})

describe('getScheduleFetchRange', () => {
  it('covers the whole month, not just the current week', () => {
    // Tuesday, Nov 3, 2026: a lesson logged for Tue Oct 27 sits in the
    // October grid, and the November grid's leading row reaches back to it.
    const { start, end } = getScheduleFetchRange(new Date(2026, 10, 3))

    expect(start.getMonth()).toBe(10)
    expect(start.getDate()).toBe(1) // Nov 1, 2026 is a Sunday
    expect(start.getHours()).toBe(0)
    expect(end.getMonth()).toBe(11)
    expect(end.getDate()).toBe(12) // 42 cells: Nov 1 + 41 days
    expect(end.getHours()).toBe(23)

    const oct = getScheduleFetchRange(new Date(2026, 9, 3))
    const lesson = new Date(2026, 9, 27, 10, 30)
    expect(lesson >= oct.start && lesson <= oct.end).toBe(true)
  })

  it('starts on the Sunday before the 1st when the month starts midweek', () => {
    // Oct 1, 2026 is a Thursday
    const { start, end } = getScheduleFetchRange(new Date(2026, 9, 20))

    expect(start.getMonth()).toBe(8)
    expect(start.getDate()).toBe(27)
    expect(end.getMonth()).toBe(10)
    expect(end.getDate()).toBe(7)
  })

  it('contains every week that touches the month', () => {
    // 31-day month starting on a Saturday spills into a sixth row
    const date = new Date(2026, 7, 15) // Aug 2026, Aug 1 is a Saturday
    const { start, end } = getScheduleFetchRange(date)
    const lastWeek = getVisibleDateRange(new Date(2026, 7, 31), 'week')

    expect(start <= getVisibleDateRange(new Date(2026, 7, 1), 'week').start).toBe(true)
    expect(end >= lastWeek.end).toBe(true)
  })
})
