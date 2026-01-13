export type DateGroup = 'pinned' | 'today' | 'yesterday' | 'thisWeek' | 'lastMonth' | 'earlier'

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
  earlier: Note[]
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
 * Group notes by date categories
 * Pinned notes are separated first, then remaining notes are grouped chronologically
 */
export function groupNotesByDate(notes: Note[]): NotesGroupedByDate {
  const now = new Date()
  now.setHours(0, 0, 0, 0) // Start of today

  const groups: NotesGroupedByDate = {
    pinned: [],
    today: [],
    yesterday: [],
    thisWeek: [],
    lastMonth: [],
    earlier: []
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
      groups.earlier.push(note)
    }
  })

  return groups
}

/**
 * Get human-readable title for date group
 */
export function getDateGroupTitle(groupKey: DateGroup): string {
  const titles: Record<DateGroup, string> = {
    pinned: 'Pinned',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    lastMonth: 'Last Month',
    earlier: 'Earlier'
  }
  return titles[groupKey]
}

/**
 * Get all date group keys in display order
 */
export function getDateGroupKeys(): DateGroup[] {
  return ['pinned', 'today', 'yesterday', 'thisWeek', 'lastMonth', 'earlier']
}
