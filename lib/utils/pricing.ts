import type { Class, PricingModel } from '@/lib/types'

/**
 * Calculate the total cost of a class based on its pricing model and enrollment count
 */
export function calculateClassCost(
  classData: Pick<Class, 'pricing_model' | 'base_cost' | 'cost_per_person' | 'cost_per_hour' | 'tiered_base_students' | 'tiered_additional_cost' | 'start_time' | 'end_time'>,
  enrolledCount: number = 0
): number {
  const { pricing_model, base_cost, cost_per_person, cost_per_hour, tiered_base_students, tiered_additional_cost, start_time, end_time } = classData

  switch (pricing_model) {
    case 'per_person':
      // Cost = Number of students × Cost per person
      if (!cost_per_person) return 0
      return enrolledCount * cost_per_person

    case 'per_class':
      // Flat rate regardless of enrollment
      return base_cost || 0

    case 'per_hour':
      // Cost = Duration in hours × Cost per hour
      if (!cost_per_hour) return 0
      const durationHours = calculateDurationHours(start_time, end_time)
      return durationHours * cost_per_hour

    case 'tiered':
      // Cost = Base cost + (Additional students × Additional cost per student)
      if (!base_cost) return 0
      const baseStudents = tiered_base_students || 0
      const additionalStudents = Math.max(0, enrolledCount - baseStudents)
      const additionalCost = additionalStudents * (tiered_additional_cost || 0)
      return base_cost + additionalCost

    default:
      return 0
  }
}

/**
 * Calculate the duration of a class in hours
 */
export function calculateDurationHours(startTime: string, endTime: string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const durationMs = end.getTime() - start.getTime()
  return durationMs / (1000 * 60 * 60) // Convert milliseconds to hours
}

/**
 * Format a price amount for display
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

/**
 * Get a human-readable description of the pricing model
 */
export function getPricingModelDescription(
  classData: Pick<Class, 'pricing_model' | 'base_cost' | 'cost_per_person' | 'cost_per_hour' | 'tiered_base_students' | 'tiered_additional_cost'>
): string {
  const { pricing_model, base_cost, cost_per_person, cost_per_hour, tiered_base_students, tiered_additional_cost } = classData

  switch (pricing_model) {
    case 'per_person':
      return cost_per_person ? `${formatPrice(cost_per_person)} per student` : 'No pricing set'

    case 'per_class':
      return base_cost ? `${formatPrice(base_cost)} flat rate` : 'No pricing set'

    case 'per_hour':
      return cost_per_hour ? `${formatPrice(cost_per_hour)} per hour` : 'No pricing set'

    case 'tiered':
      if (!base_cost) return 'No pricing set'
      const baseStudentsText = tiered_base_students || 0
      const additionalCostText = tiered_additional_cost ? formatPrice(tiered_additional_cost) : '$0'
      return `${formatPrice(base_cost)} for first ${baseStudentsText} student${baseStudentsText !== 1 ? 's' : ''}, then ${additionalCostText} per additional student`

    default:
      return 'No pricing set'
  }
}

/**
 * Validate pricing data based on the selected pricing model
 */
export function validatePricingData(
  pricingModel: PricingModel,
  data: {
    base_cost?: number | null
    cost_per_person?: number | null
    cost_per_hour?: number | null
    tiered_base_students?: number | null
    tiered_additional_cost?: number | null
  }
): { valid: boolean; error?: string } {
  switch (pricingModel) {
    case 'per_person':
      if (!data.cost_per_person || data.cost_per_person <= 0) {
        return { valid: false, error: 'Cost per person is required and must be greater than 0' }
      }
      break

    case 'per_class':
      if (!data.base_cost || data.base_cost <= 0) {
        return { valid: false, error: 'Base cost is required and must be greater than 0' }
      }
      break

    case 'per_hour':
      if (!data.cost_per_hour || data.cost_per_hour <= 0) {
        return { valid: false, error: 'Cost per hour is required and must be greater than 0' }
      }
      break

    case 'tiered':
      if (!data.base_cost || data.base_cost <= 0) {
        return { valid: false, error: 'Base cost is required and must be greater than 0' }
      }
      if (!data.tiered_base_students || data.tiered_base_students < 1) {
        return { valid: false, error: 'Base number of students is required and must be at least 1' }
      }
      if (!data.tiered_additional_cost || data.tiered_additional_cost < 0) {
        return { valid: false, error: 'Additional cost per student is required and must be 0 or greater' }
      }
      break
  }

  return { valid: true }
}
