import { describe, it, expect } from 'vitest'
import { etDayKey } from '@/lib/utils/et-timezone'

describe('etDayKey', () => {
  it('formats an instant as its YYYY-MM-DD day in Eastern Time', () => {
    expect(etDayKey(new Date('2026-08-06T16:00:00.000Z'))).toBe('2026-08-06')
  })

  it('reports the previous ET day for a UTC instant past midnight but before ET midnight', () => {
    // 03:00 UTC on the 6th is 23:00 ET on the 5th — still "yesterday" to the studio.
    expect(etDayKey(new Date('2026-08-06T03:00:00.000Z'))).toBe('2026-08-05')
  })

  it('rolls to the next ET day exactly at ET midnight', () => {
    // 04:00 UTC = 00:00 EDT.
    expect(etDayKey(new Date('2026-08-06T03:59:59.000Z'))).toBe('2026-08-05')
    expect(etDayKey(new Date('2026-08-06T04:00:00.000Z'))).toBe('2026-08-06')
  })

  it('handles the EST offset outside daylight saving', () => {
    // 05:00 UTC = 00:00 EST in January.
    expect(etDayKey(new Date('2026-01-15T04:59:59.000Z'))).toBe('2026-01-14')
    expect(etDayKey(new Date('2026-01-15T05:00:00.000Z'))).toBe('2026-01-15')
  })
})
