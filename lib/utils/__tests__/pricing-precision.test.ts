import { describe, it, expect } from 'vitest'
import { calculateClassCost, sumPrices } from '../pricing'

const base = {
  base_cost: null,
  cost_per_person: null,
  cost_per_hour: null,
  tiered_base_students: null,
  tiered_additional_cost: null,
  start_time: '2024-02-01T10:00:00Z',
  end_time: '2024-02-01T11:00:00Z',
}

describe('pricing precision', () => {
  it('rounds a per_hour cost to whole cents', () => {
    // 90 minutes at $33.33/hr = 49.995 — a value DECIMAL(10,2) cannot hold.
    const classData = {
      ...base,
      pricing_model: 'per_hour' as const,
      cost_per_hour: 33.33,
      start_time: '2024-02-01T10:00:00Z',
      end_time: '2024-02-01T11:30:00Z',
    }

    expect(calculateClassCost(classData, 0)).toBe(50)
  })

  it('rounds a per_person cost to whole cents', () => {
    // 3 x 16.67 = 50.010000000000005 in floating point
    const classData = {
      ...base,
      pricing_model: 'per_person' as const,
      cost_per_person: 16.67,
    }

    expect(calculateClassCost(classData, 3)).toBe(50.01)
  })

  it('rounds a tiered cost to whole cents', () => {
    const classData = {
      ...base,
      pricing_model: 'tiered' as const,
      base_cost: 100.1,
      tiered_base_students: 2,
      tiered_additional_cost: 10.2,
    }

    // 100.10 + (3 x 10.20) = 130.70, which floats render as 130.70000000000002
    expect(calculateClassCost(classData, 5)).toBe(130.7)
  })

  describe('sumPrices', () => {
    it('totals prices without floating point drift', () => {
      expect(sumPrices([1000.01, 200.55, 34.0])).toBe(1234.56)
    })

    it('ignores null and undefined amounts', () => {
      expect(sumPrices([10.01, null, undefined, 0.99])).toBe(11)
    })

    it('returns 0 for an empty list', () => {
      expect(sumPrices([])).toBe(0)
    })
  })
})
