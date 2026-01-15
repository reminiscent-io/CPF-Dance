// Static date groups
export type StaticDateGroup = 'pinned' | 'today' | 'yesterday' | 'thisWeek' | 'lastMonth'

// DateGroup can be static groups or dynamic month keys (e.g., "month-2024-12")
export type DateGroup = StaticDateGroup | string

export interface Note {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  visibility: string
  created_at: string
  updated_at: string
  author_id: string
  is_personal: boolean
  is_pinned?: boolean
  pin_order?: number | null
  [key: string]: any
}

export interface NotesGroupedByDate {
  pinned: Note[]
  today: Note[]
  yesterday: Note[]
  thisWeek: Note[]
  lastMonth: Note[]
  [key: string]: Note[] // Dynamic month keys like "month-2024-12"
}

/**
 * Convert a date to a relative time string
 * Examples: "Just now", "5m ago", "2h ago", "3d ago", "Jan 15"
 */
export function getRelativeTimeString(date: Date | string): string {
  const now = new Date()
  const noteDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - noteDate.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  // Fallback to formatted date
  return noteDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Generate a month key from a date (e.g., "month-2024-12")
 */
function getMonthKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `month-${year}-${month}`
}

/**
 * Check if a key is a month key
 */
export function isMonthKey(key: string): boolean {
  return key.startsWith('month-')
}

/**
 * Group notes by date categories
 * Pinned notes are separated first, then remaining notes are grouped chronologically
 * Notes older than ~30 days are grouped by month
 */
export function groupNotesByDate(notes: Note[]): NotesGroupedByDate {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today

  const groups: NotesGroupedByDate = {
    pinned: [],
    today: [],
    yesterday: [],
    thisWeek: [],
    lastMonth: []
  }

  notes.forEach(note => {
    // Pinned notes go to pinned section regardless of date
    if (note.is_pinned) {
      groups.pinned.push(note)
      return
    }

    const noteDate = new Date(note.created_at)
    noteDate.setHours(0, 0, 0, 0) // Start of note's day

    const daysDiff = Math.floor((now.getTime() - noteDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff === 0) {
      groups.today.push(note)
    } else if (daysDiff === 1) {
      groups.yesterday.push(note)
    } else if (daysDiff <= 7) {
      groups.thisWeek.push(note)
    } else if (daysDiff <= 30) {
      groups.lastMonth.push(note)
    } else {
      // Group by month for older notes
      const monthKey = getMonthKey(new Date(note.created_at))
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(note)
    }
  })

  return groups
}

/**
 * Get human-readable title for date group
 */
export function getDateGroupTitle(groupKey: DateGroup): string {
  // Handle static groups
  const staticTitles: Record<StaticDateGroup, string> = {
    pinned: 'Pinned',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    lastMonth: 'Last Month'
  }

  if (groupKey in staticTitles) {
    return staticTitles[groupKey as StaticDateGroup]
  }

  // Handle month keys (e.g., "month-2024-12" -> "December 2024")
  if (isMonthKey(groupKey)) {
    const parts = groupKey.split('-')
    const year = parseInt(parts[1])
    const month = parseInt(parts[2]) - 1 // JavaScript months are 0-indexed
    const date = new Date(year, month, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  return groupKey
}

/**
 * Get all date group keys in display order from grouped notes
 * Static groups first, then month groups sorted by date (newest first)
 */
export function getDateGroupKeys(groupedNotes?: NotesGroupedByDate): DateGroup[] {
  const staticKeys: StaticDateGroup[] = ['pinned', 'today', 'yesterday', 'thisWeek', 'lastMonth']

  if (!groupedNotes) {
    return staticKeys
  }

  // Extract month keys from grouped notes and sort them (newest first)
  const monthKeys = Object.keys(groupedNotes)
    .filter(isMonthKey)
    .sort((a, b) => b.localeCompare(a)) // Reverse alphabetical = newest first for month-YYYY-MM format

  return [...staticKeys, ...monthKeys]
}
