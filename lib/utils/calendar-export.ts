import { ET_TIMEZONE } from './et-timezone'

interface ClassEvent {
  id: string
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
}

export function generateICSContent(event: ClassEvent): string {
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  // Format date in Eastern Time for ICS with TZID (no Z suffix)
  const formatDateET = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ET_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    const parts = formatter.formatToParts(date)
    const p: Record<string, string> = {}
    parts.forEach(part => { p[part.type] = part.value })
    return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`
  }

  // Format date in UTC for the DTSTAMP field
  const formatDateUTC = (date: Date): string => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    const seconds = String(date.getUTCSeconds()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CPF Dance//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:America/New_York',
    'BEGIN:STANDARD',
    'DTSTART:20231105T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0500',
    'TZNAME:EST',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:20240310T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0400',
    'TZNAME:EDT',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${event.id}@cpfdance.local`,
    `DTSTAMP:${formatDateUTC(new Date())}`,
    `DTSTART;TZID=America/New_York:${formatDateET(startDate)}`,
    `DTEND;TZID=America/New_York:${formatDateET(endDate)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    ...(event.description ? [`DESCRIPTION:${escapeICSText(event.description)}`] : []),
    ...(event.location ? [`LOCATION:${escapeICSText(event.location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  return ics
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n')
}

export function downloadICS(event: ClassEvent): void {
  const icsContent = generateICSContent(event)
  const blob = new Blob([icsContent], { type: 'text/calendar' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${event.title.replace(/\s+/g, '-')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function generateGoogleCalendarLink(event: ClassEvent): string {
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  const formatGoogleDate = (date: Date): string => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    return `${year}${month}${day}T${hours}${minutes}00Z`
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    ...(event.description && { details: event.description }),
    ...(event.location && { location: event.location }),
    ctz: 'America/New_York'
  })

  return `https://calendar.google.com/calendar/u/0/r/eventedit?${params.toString()}`
}

export function generateOutlookLink(event: ClassEvent): string {
  const startDate = new Date(event.start_time)
  const endDate = new Date(event.end_time)

  const formatOutlookDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').replace('.000', '')
  }

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: formatOutlookDate(startDate),
    enddt: formatOutlookDate(endDate),
    ...(event.description && { body: event.description }),
    ...(event.location && { location: event.location })
  })

  return `https://outlook.office.com/calendar/0/compose?${params.toString()}`
}
