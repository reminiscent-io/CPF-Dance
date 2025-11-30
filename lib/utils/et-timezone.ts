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

export function displayETLabel(): string {
  return 'Eastern Time (ET)'
}
