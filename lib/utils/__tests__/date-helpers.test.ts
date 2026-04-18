import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getRelativeTimeString,
  groupNotesByDate,
  getDateGroupTitle,
  getDateGroupKeys,
  isMonthKey,
  type Note
} from '../date-helpers'

describe('date-helpers', () => {
  describe('getRelativeTimeString', () => {
    beforeEach(() => {
      // Mock current time to a fixed date for consistent tests
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "Just now" for very recent times', () => {
      const now = new Date('2024-02-15T12:00:00Z')
      expect(getRelativeTimeString(now)).toBe('Just now')

      const thirtySecondsAgo = new Date('2024-02-15T11:59:30Z')
      expect(getRelativeTimeString(thirtySecondsAgo)).toBe('Just now')
    })

    it('should return minutes ago for times within the last hour', () => {
      const fiveMinutesAgo = new Date('2024-02-15T11:55:00Z')
      expect(getRelativeTimeString(fiveMinutesAgo)).toBe('5m ago')

      const thirtyMinutesAgo = new Date('2024-02-15T11:30:00Z')
      expect(getRelativeTimeString(thirtyMinutesAgo)).toBe('30m ago')
    })

    it('should return hours ago for times within the last day', () => {
      const twoHoursAgo = new Date('2024-02-15T10:00:00Z')
      expect(getRelativeTimeString(twoHoursAgo)).toBe('2h ago')

      const twentyThreeHoursAgo = new Date('2024-02-14T13:00:00Z')
      expect(getRelativeTimeString(twentyThreeHoursAgo)).toBe('23h ago')
    })

    it('should return days ago for times within the last week', () => {
      const twoDaysAgo = new Date('2024-02-13T12:00:00Z')
      expect(getRelativeTimeString(twoDaysAgo)).toBe('2d ago')

      const sixDaysAgo = new Date('2024-02-09T12:00:00Z')
      expect(getRelativeTimeString(sixDaysAgo)).toBe('6d ago')
    })

    it('should return formatted date for times older than a week', () => {
      const twoWeeksAgo = new Date('2024-02-01T12:00:00Z')
      expect(getRelativeTimeString(twoWeeksAgo)).toBe('Feb 1')

      const lastMonth = new Date('2024-01-15T12:00:00Z')
      expect(getRelativeTimeString(lastMonth)).toBe('Jan 15')
    })

    it('should accept string dates', () => {
      expect(getRelativeTimeString('2024-02-15T11:55:00Z')).toBe('5m ago')
    })
  })

  describe('isMonthKey', () => {
    it('should return true for valid month keys', () => {
      expect(isMonthKey('month-2024-01')).toBe(true)
      expect(isMonthKey('month-2023-12')).toBe(true)
      expect(isMonthKey('month-2025-06')).toBe(true)
    })

    it('should return false for static date group keys', () => {
      expect(isMonthKey('today')).toBe(false)
      expect(isMonthKey('yesterday')).toBe(false)
      expect(isMonthKey('thisWeek')).toBe(false)
      expect(isMonthKey('lastMonth')).toBe(false)
    })

    it('should return false for invalid strings', () => {
      expect(isMonthKey('')).toBe(false)
      expect(isMonthKey('2024-01')).toBe(false)
      expect(isMonthKey('month')).toBe(false)
    })
  })

  describe('groupNotesByDate', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-02-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    const createNote = (overrides: Partial<Note> = {}): Note => ({
      id: 'test-id',
      title: 'Test Note',
      content: 'Test content',
      tags: null,
      visibility: 'private',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_id: 'author-1',
      is_personal: true,
      ...overrides
    })

    it('should group today notes', () => {
      const notes: Note[] = [
        createNote({ id: '1', created_at: '2024-02-15T10:00:00Z' }),
        createNote({ id: '2', created_at: '2024-02-15T08:00:00Z' })
      ]

      const grouped = groupNotesByDate(notes)

      expect(grouped.today).toHaveLength(2)
    })

    it('should group yesterday notes', () => {
      const notes: Note[] = [
        createNote({ id: '1', created_at: '2024-02-14T10:00:00Z' }),
        createNote({ id: '2', created_at: '2024-02-14T08:00:00Z' })
      ]

      const grouped = groupNotesByDate(notes)

      expect(grouped.yesterday).toHaveLength(2)
    })

    it('should group this week notes (2-7 days ago)', () => {
      const notes: Note[] = [
        createNote({ id: '1', created_at: '2024-02-13T10:00:00Z' }), // 2 days ago
        createNote({ id: '2', created_at: '2024-02-10T10:00:00Z' }), // 5 days ago
        createNote({ id: '3', created_at: '2024-02-08T10:00:00Z' })  // 7 days ago
      ]

      const grouped = groupNotesByDate(notes)

      expect(grouped.thisWeek).toHaveLength(3)
    })

    it('should group last month notes (8-30 days ago)', () => {
      const notes: Note[] = [
        createNote({ id: '1', created_at: '2024-02-07T10:00:00Z' }), // 8 days ago
        createNote({ id: '2', created_at: '2024-01-20T10:00:00Z' }), // 26 days ago
        createNote({ id: '3', created_at: '2024-01-16T10:00:00Z' })  // 30 days ago
      ]

      const grouped = groupNotesByDate(notes)

      expect(grouped.lastMonth).toHaveLength(3)
    })

    it('should group older notes by month', () => {
      const notes: Note[] = [
        createNote({ id: '1', created_at: '2024-01-10T10:00:00Z' }), // January 2024
        createNote({ id: '2', created_at: '2024-01-05T10:00:00Z' }), // January 2024
        createNote({ id: '3', created_at: '2023-12-15T10:00:00Z' }), // December 2023
        createNote({ id: '4', created_at: '2023-11-20T10:00:00Z' })  // November 2023
      ]

      const grouped = groupNotesByDate(notes)

      expect(grouped['month-2024-01']).toHaveLength(2)
      expect(grouped['month-2023-12']).toHaveLength(1)
      expect(grouped['month-2023-11']).toHaveLength(1)
    })

    it('should return empty groups for no notes', () => {
      const grouped = groupNotesByDate([])

      expect(grouped.today).toHaveLength(0)
      expect(grouped.yesterday).toHaveLength(0)
      expect(grouped.thisWeek).toHaveLength(0)
      expect(grouped.lastMonth).toHaveLength(0)
    })

    it('should handle mixed date notes correctly', () => {
      const notes: Note[] = [
        createNote({ id: 'today', created_at: '2024-02-15T08:00:00Z' }),
        createNote({ id: 'yesterday', created_at: '2024-02-14T10:00:00Z' }),
        createNote({ id: 'thisWeek', created_at: '2024-02-10T10:00:00Z' }),
        createNote({ id: 'lastMonth', created_at: '2024-01-20T10:00:00Z' }),
        createNote({ id: 'older', created_at: '2023-06-15T10:00:00Z' })
      ]

      const grouped = groupNotesByDate(notes)

      expect(grouped.today.map(n => n.id)).toEqual(['today'])
      expect(grouped.yesterday.map(n => n.id)).toEqual(['yesterday'])
      expect(grouped.thisWeek.map(n => n.id)).toEqual(['thisWeek'])
      expect(grouped.lastMonth.map(n => n.id)).toEqual(['lastMonth'])
      expect(grouped['month-2023-06'].map(n => n.id)).toEqual(['older'])
    })
  })

  describe('getDateGroupTitle', () => {
    it('should return correct titles for static groups', () => {
      expect(getDateGroupTitle('today')).toBe('Today')
      expect(getDateGroupTitle('yesterday')).toBe('Yesterday')
      expect(getDateGroupTitle('thisWeek')).toBe('This Week')
      expect(getDateGroupTitle('lastMonth')).toBe('Last Month')
    })

    it('should format month keys correctly', () => {
      expect(getDateGroupTitle('month-2024-01')).toBe('January 2024')
      expect(getDateGroupTitle('month-2024-06')).toBe('June 2024')
      expect(getDateGroupTitle('month-2024-12')).toBe('December 2024')
      expect(getDateGroupTitle('month-2023-03')).toBe('March 2023')
    })

    it('should return the key for unknown groups', () => {
      expect(getDateGroupTitle('unknown-key')).toBe('unknown-key')
    })
  })

  describe('getDateGroupKeys', () => {
    it('should return static keys when no grouped notes provided', () => {
      const keys = getDateGroupKeys()

      expect(keys).toEqual(['today', 'yesterday', 'thisWeek', 'lastMonth'])
    })

    it('should return static keys when grouped notes is undefined', () => {
      const keys = getDateGroupKeys(undefined)

      expect(keys).toEqual(['today', 'yesterday', 'thisWeek', 'lastMonth'])
    })

    it('should include month keys after static keys', () => {
      const groupedNotes = {
        today: [],
        yesterday: [],
        thisWeek: [],
        lastMonth: [],
        'month-2024-01': [{ id: '1' }],
        'month-2023-12': [{ id: '2' }]
      } as any

      const keys = getDateGroupKeys(groupedNotes)

      expect(keys).toEqual([
        'today', 'yesterday', 'thisWeek', 'lastMonth',
        'month-2024-01', 'month-2023-12' // Sorted newest first (reverse alphabetical)
      ])
    })

    it('should sort month keys newest first', () => {
      const groupedNotes = {
        today: [],
        yesterday: [],
        thisWeek: [],
        lastMonth: [],
        'month-2023-06': [{ id: '1' }],
        'month-2024-01': [{ id: '2' }],
        'month-2023-12': [{ id: '3' }],
        'month-2023-01': [{ id: '4' }]
      } as any

      const keys = getDateGroupKeys(groupedNotes)

      const monthKeys = keys.filter(k => k.startsWith('month-'))
      expect(monthKeys).toEqual([
        'month-2024-01',
        'month-2023-12',
        'month-2023-06',
        'month-2023-01'
      ])
    })

    it('should handle grouped notes with no month keys', () => {
      const groupedNotes = {
        today: [{ id: '1' }],
        yesterday: [],
        thisWeek: [],
        lastMonth: []
      } as any

      const keys = getDateGroupKeys(groupedNotes)

      expect(keys).toEqual(['today', 'yesterday', 'thisWeek', 'lastMonth'])
    })
  })
})
