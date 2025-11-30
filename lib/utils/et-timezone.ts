export function convertETToUTC(etDateTimeString: string): string {
  if (!etDateTimeString) return etDateTimeString
  
  const etDate = new Date(etDateTimeString)
  const utcDate = new Date(etDate.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const offset = etDate.getTime() - utcDate.getTime()
  
  return new Date(etDate.getTime() + offset).toISOString()
}

export function displayETLabel(): string {
  return 'Eastern Time (ET)'
}
