/**
 * Timezone utilities for Eastern Time handling
 * All event times are stored in UTC but displayed/input in Eastern Time (ET)
 */

/**
 * Convert UTC datetime to Eastern Time datetime-local format
 */
export function utcToEastern(utcDateString: string): string {
  if (!utcDateString) return ''
  
  const utcDate = new Date(utcDateString)
  const easternDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  
  // Format as datetime-local (YYYY-MM-DDTHH:mm)
  const year = easternDate.getFullYear()
  const month = String(easternDate.getMonth() + 1).padStart(2, '0')
  const day = String(easternDate.getDate()).padStart(2, '0')
  const hours = String(easternDate.getHours()).padStart(2, '0')
  const minutes = String(easternDate.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Convert Eastern Time datetime-local to UTC ISO string
 */
export function easternToUtc(easternDateString: string): string {
  if (!easternDateString) return ''
  
  // Parse the datetime-local string (YYYY-MM-DDTHH:mm)
  const [datePart, timePart] = easternDateString.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  
  // Create a date in Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/New_York'
  })
  
  // Create initial UTC guess
  let utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))
  
  // Adjust for timezone offset
  let formattedET = formatter.format(utcDate)
  let [formattedDate, formattedTime] = formattedET.split(', ')
  let [fYear, fMonth, fDay] = formattedDate.split('/').map(Number)
  let [fHours, fMinutes, fSeconds] = formattedTime.split(':').map(Number)
  
  const offset = Math.round((Date.UTC(fYear, fMonth - 1, fDay, fHours, fMinutes, fSeconds) - utcDate.getTime()) / 60000)
  utcDate = new Date(utcDate.getTime() + offset * 60000)
  
  return utcDate.toISOString().slice(0, 16)
}

/**
 * Format a UTC date for Eastern Time display
 */
export function formatEasternTime(utcDateString: string, showTime = true): string {
  if (!utcDateString) return ''
  
  const utcDate = new Date(utcDateString)
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }
  
  if (showTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
    options.hour12 = true
  }
  
  return new Date(utcDate.toLocaleString('en-US', { timeZone: 'America/New_York' })).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(showTime && { hour: '2-digit', minute: '2-digit', hour12: true })
  })
}

/**
 * Get current time in Eastern Time as datetime-local format
 */
export function getCurrentEasternTime(): string {
  const now = new Date()
  return utcToEastern(now.toISOString())
}
