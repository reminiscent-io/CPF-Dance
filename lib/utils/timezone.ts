export function getTimezoneOffset(timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const now = new Date()
  const parts = formatter.formatToParts(now)
  const partsObject: Record<string, string> = {}
  
  parts.forEach(part => {
    partsObject[part.type] = part.value
  })
  
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(`${partsObject.year}-${partsObject.month}-${partsObject.day}T${partsObject.hour}:${partsObject.minute}:${partsObject.second}`)
  
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
}

export function formatTimeInTimezone(utcDateString: string, timezone: string): string {
  const date = new Date(utcDateString)
  return date.toLocaleString('en-US', { timeZone: timezone })
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch (ex) {
    return false
  }
}

export const COMMON_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC'
]
