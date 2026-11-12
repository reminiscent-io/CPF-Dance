import type { Class, ClassType } from '@/lib/types'
import { convertETToUTC } from '@/lib/utils/et-timezone'
import { centsToDollars, parseCurrencyToCents } from '@/lib/utils/money'

// All class times are authored and displayed in Eastern Time
export const ET = 'America/New_York'

export interface UnlinkedPurchase {
  id: string
  class_id: string
  workshop_option: 'full' | 'day' | null
  buyer_name: string | null
  buyer_email: string | null
  buyer_phone: string | null
  amount_paid: number
  purchased_at: string
}

// Helper function to parse currency values and round to 2 decimal places.
// Rounding runs through the shared money helper: Math.round(num * 100) drops a
// cent at half-cent boundaries, because 1.005 * 100 is 100.49999999999999.
// Allows 0 for free classes; returns undefined only for empty/non-numeric input.
export const parseCurrency = (value: string): number | undefined => {
  const cents = parseCurrencyToCents(value)
  return cents === undefined ? undefined : centsToDollars(cents)
}

export const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  group: 'Group',
  private: 'Private',
  workshop: 'Workshop',
  master_class: 'Master Class',
  competition_choreography: 'Competition Choreography',
}

// Compact, glanceable price for an agenda row. The long-form pricing
// description still lives in the edit modal; here a $200/hr private must
// read at a different weight than a $6 drop-in, so we keep it terse.
export const compactPrice = (cls: Class): string | null => {
  const money = (n: number) => {
    const v = Math.round(n * 100) / 100
    return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`
  }
  switch (cls.pricing_model) {
    case 'per_person':
      return cls.cost_per_person ? `${money(cls.cost_per_person)}/student` : null
    case 'per_class':
      return cls.base_cost ? `${money(cls.base_cost)} flat` : null
    case 'per_hour':
      return cls.cost_per_hour ? `${money(cls.cost_per_hour)}/hr` : null
    case 'tiered':
      return cls.base_cost ? `from ${money(cls.base_cost)}` : null
    default:
      return null
  }
}

export interface InstructorOption {
  id: string
  full_name: string
}

export interface StudentOption {
  id: string
  full_name: string
  email: string
  profile?: { full_name: string; email?: string }
}

export async function loadInstructorProfiles() {
  const response = await fetch('/api/profiles?role=instructor')
  if (!response.ok) throw new Error('Failed to fetch instructors')
  const data = await response.json()
  return data.profiles || []
}

export async function loadStudents() {
  const response = await fetch('/api/students')
  if (!response.ok) throw new Error('Failed to fetch students')
  const data = await response.json()
  return data.students || []
}

export async function loadEnrollments(classId: string) {
  const response = await fetch(`/api/classes/${classId}/enrollments`)
  if (!response.ok) throw new Error('Failed to fetch enrollments')
  const result = await response.json()
  return result.enrollments || []
}

// Helper to get student display name (handles both linked and unlinked students)
export const getStudentDisplayName = (student: { full_name?: string | null; profile?: { full_name?: string } }) => {
  return student.full_name || student.profile?.full_name || 'Unknown'
}

// Helper to get student email (handles both linked and unlinked students)
export const getStudentEmail = (student: { email?: string | null; profile?: { email?: string } }) => {
  return student.email || student.profile?.email || ''
}

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Helper function to format duration for display
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}hr`
  return `${hours}hr ${mins}min`
}

// Generate duration options in 5-minute increments
export const DURATION_OPTIONS = [
  15, 20, 25, 30, 35, 40, 45, 50, 55, 60, // up to 1 hour
  75, 90, 105, 120, // 1.25hr, 1.5hr, 1.75hr, 2hr
  150, 180, 210, 240 // 2.5hr, 3hr, 3.5hr, 4hr
]

// Start and end of a class in UTC, from an ET datetime-local start and a length
export const classTimesToUTC = (startET: string, durationMinutes: number) => {
  const startUTC = convertETToUTC(startET)
  const startDate = new Date(startUTC)
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
  return { start_time: startUTC, end_time: endDate.toISOString() }
}

// Weekly repeat dates as ET datetime-local strings, from the day after startTime
// through endDate. includeStart puts startTime itself first.
export const calculateRecurringDates = (
  startTime: string,
  endDate: string,
  selectedDays: number[],
  includeStart: boolean
): string[] => {
  if (!startTime || !endDate || selectedDays.length === 0) {
    return []
  }

  const dates: string[] = []

  // Parse the datetime-local format (e.g., "2024-12-15T14:00")
  const [datePart, timePart] = startTime.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)

  const [endYear, endMonth, endDay] = endDate.split('-').map(Number)

  let currentYear = year
  let currentMonth = month
  let currentDay = day

  const getDayOfWeek = (y: number, m: number, d: number): number => {
    const date = new Date(y, m - 1, d)
    return date.getDay()
  }

  const isBeforeOrEqual = (y1: number, m1: number, d1: number, y2: number, m2: number, d2: number): boolean => {
    if (y1 < y2) return true
    if (y1 > y2) return false
    if (m1 < m2) return true
    if (m1 > m2) return false
    return d1 <= d2
  }

  const daysInMonth = (y: number, m: number): number => {
    return new Date(y, m, 0).getDate()
  }

  const advanceDay = (y: number, m: number, d: number): [number, number, number] => {
    d++
    if (d > daysInMonth(y, m)) {
      d = 1
      m++
      if (m > 12) {
        m = 1
        y++
      }
    }
    return [y, m, d]
  }

  const formatDateTimeLocal = (y: number, m: number, d: number, h: number, min: number): string => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }

  if (includeStart) dates.push(startTime)

  ;[currentYear, currentMonth, currentDay] = advanceDay(currentYear, currentMonth, currentDay)

  while (isBeforeOrEqual(currentYear, currentMonth, currentDay, endYear, endMonth, endDay)) {
    if (selectedDays.includes(getDayOfWeek(currentYear, currentMonth, currentDay))) {
      dates.push(formatDateTimeLocal(currentYear, currentMonth, currentDay, hours, minutes))
    }
    ;[currentYear, currentMonth, currentDay] = advanceDay(currentYear, currentMonth, currentDay)
  }

  return dates
}
