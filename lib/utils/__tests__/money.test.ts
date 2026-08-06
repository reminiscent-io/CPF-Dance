import { describe, it, expect } from 'vitest'
import { parseCurrencyToCents, centsToDollars, dollarsToCents, sumCents, formatCents } from '../money'

describe('money', () => {
  describe('parseCurrencyToCents', () => {
    it('rounds half-cent values up instead of down', () => {
      // 1.005 * 100 is 100.49999999999999 in binary floating point, so a naive
      // Math.round(n * 100) silently drops the cent.
      expect(parseCurrencyToCents('1.005')).toBe(101)
      expect(parseCurrencyToCents('8.165')).toBe(817)
    })

    it('parses ordinary prices exactly', () => {
      expect(parseCurrencyToCents('25.00')).toBe(2500)
      expect(parseCurrencyToCents('12.05')).toBe(1205)
      expect(parseCurrencyToCents('0.50')).toBe(50)
      expect(parseCurrencyToCents('10.99')).toBe(1099)
    })

    it('preserves zero as a real value', () => {
      expect(parseCurrencyToCents('0')).toBe(0)
      expect(parseCurrencyToCents('0.00')).toBe(0)
    })

    it('returns undefined for empty or non-numeric input', () => {
      expect(parseCurrencyToCents('')).toBeUndefined()
      expect(parseCurrencyToCents('abc')).toBeUndefined()
    })
  })

  describe('dollarsToCents', () => {
    it('converts sub-cent products without losing a cent', () => {
      // 1.5h x $33.33/hr = 49.995 — must not silently become 49.99
      expect(dollarsToCents(49.995)).toBe(5000)
      // 3 x 16.67 = 50.010000000000005 in floating point
      expect(dollarsToCents(50.010000000000005)).toBe(5001)
    })
  })

  describe('sumCents', () => {
    it('sums money without floating point drift', () => {
      // The float equivalent of this sum is 1234.5600000000002
      const cents = [1000.01, 200.55, 34.0].map((d) => dollarsToCents(d))
      expect(centsToDollars(sumCents(cents))).toBe(1234.56)
    })
  })

  describe('formatCents', () => {
    it('formats cents as a currency string', () => {
      expect(formatCents(5000)).toBe('$50.00')
      expect(formatCents(1205)).toBe('$12.05')
      expect(formatCents(0)).toBe('$0.00')
    })
  })
})
