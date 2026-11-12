export function convertETToUTC(etDateTimeString: string): string {
  if (!etDateTimeString) return etDateTimeString
  
  // Parse the datetime-local string (format: "2024-12-15T11:00")
  const [datePart, timePart] = etDateTimeString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  
  // Create a date object (browser treats this as UTC initially)
  const dateAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  
  // Format this UTC time as ET to see what ET time it represents
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const etParts = etFormatter.formatToParts(dateAsUTC)
  const etObj: Record<string, string> = {}
  etParts.forEach(part => {
    etObj[part.type] = part.value
  })
  
  const etYear = parseInt(etObj.year)
  const etMonth = parseInt(etObj.month)
  const etDay = parseInt(etObj.day)
  const etHour = parseInt(etObj.hour)
  const etMinute = parseInt(etObj.minute)
  const etSecond = parseInt(etObj.second)
  
  // What our input represents if interpreted as UTC
  const inputAsUTC = new Date(Date.UTC(etYear, etMonth - 1, etDay, etHour, etMinute, etSecond))
  
  // Offset needed to convert from what we want (ET time) to UTC
  const offset = dateAsUTC.getTime() - inputAsUTC.getTime()
  
  // Apply offset
  return new Date(dateAsUTC.getTime() + offset).toISOString()
}

export function convertUTCToET(utcDateString: string): string {
  if (!utcDateString) return utcDateString
  
  const date = new Date(utcDateString)
  
  // Format the UTC time as ET
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const etParts = etFormatter.formatToParts(date)
  const etObj: Record<string, string> = {}
  etParts.forEach(part => {
    etObj[part.type] = part.value
  })
  
  // Format as datetime-local input format
  return `${etObj.year}-${etObj.month}-${etObj.day}T${etObj.hour}:${etObj.minute}`
}

// ============================================
// Display Formatting Functions (ET-aware)
// ============================================

export const ET_TIMEZONE = 'America/New_York'

/**
 * The ET calendar day an instant falls on, as a sortable YYYY-MM-DD key.
 * Grouping and "Today" / "Tomorrow" labels key off this, so it has to follow
 * the studio's day boundary rather than UTC's.
 */
export function etDayKey(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: ET_TIMEZONE })
}

/**
 * Format time in ET (e.g., "2:30 PM")
 */
export function formatTimeET(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleTimeString('en-US', {
    timeZone: ET_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Format date in ET (e.g., "January 15, 2024")
 */
export function formatDateET(
  dateString: string | Date,
  options?: { month?: 'long' | 'short' | 'numeric'; day?: 'numeric' | '2-digit'; year?: 'numeric' | '2-digit'; weekday?: 'long' | 'short' }
): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: ET_TIMEZONE,
    month: options?.month ?? 'long',
    day: options?.day ?? 'numeric',
    year: options?.year ?? 'numeric',
    ...(options?.weekday && { weekday: options.weekday })
  }
  return date.toLocaleDateString('en-US', defaultOptions)
}

/**
 * Get hour in ET for calendar grid positioning (0-23)
 */
export function getHourInET(dateString: string | Date): number {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    hour: 'numeric',
    hour12: false
  })
  const parts = formatter.formatToParts(date)
  const hourPart = parts.find(p => p.type === 'hour')
  return hourPart ? parseInt(hourPart.value, 10) : 0
}

/**
 * Get date parts in ET for comparison
 */
function getDatePartsInET(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(date)
  const partsObj: Record<string, string> = {}
  parts.forEach(p => { partsObj[p.type] = p.value })

  return {
    year: parseInt(partsObj.year, 10),
    month: parseInt(partsObj.month, 10),
    day: parseInt(partsObj.day, 10)
  }
}

/**
 * Check if two dates are the same day in ET
 */
export function isSameDateET(date1: Date, date2: Date): boolean {
  const parts1 = getDatePartsInET(date1)
  const parts2 = getDatePartsInET(date2)
  return parts1.year === parts2.year &&
         parts1.month === parts2.month &&
         parts1.day === parts2.day
}

/**
 * Check if a date is today in ET
 */
export function isTodayET(date: Date): boolean {
  return isSameDateET(date, new Date())
}

/**
 * Format weekday in ET (e.g., "Mon", "Monday")
 */
export function formatWeekdayET(dateString: string | Date, format: 'short' | 'long' = 'short'): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return date.toLocaleDateString('en-US', {
    timeZone: ET_TIMEZONE,
    weekday: format
  })
}

/**
 * Get the day of month in ET (1-31)
 */
export function getDayOfMonthET(date: Date): number {
  const parts = getDatePartsInET(date)
  return parts.day
}
