'use client'

import { NoteFeedItem } from './NoteFeedItem'
import {
  groupNotesByDate,
  getDateGroupTitle,
  getDateGroupKeys,
  Note,
  DateGroup
} from '@/lib/utils/date-helpers'

interface NoteFeedListProps {
  notes: Note[]
  onEdit: (note: Note) => void
  onDelete: (noteId: string) => void
  onPin: (noteId: string) => void
}

export function NoteFeedList({ notes, onEdit, onDelete, onPin }: NoteFeedListProps) {
  const groupedNotes = groupNotesByDate(notes)
  const groupKeys = getDateGroupKeys()

  // Filter out empty groups
  const nonEmptyGroups = groupKeys.filter(key => groupedNotes[key].length > 0)

  if (nonEmptyGroups.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">📝</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Notes Yet
        </h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Start capturing your dance journey! Tap the + button to create your first note.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline visual - vertical gradient line */}
      <div
        className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-300 via-purple-300 to-mauve-300 hidden sm:block"
        aria-hidden="true"
      />

      {/* Date-grouped notes */}
      <div className="space-y-6">
        {nonEmptyGroups.map((groupKey) => {
          const groupNotes = groupedNotes[groupKey]
          const groupTitle = getDateGroupTitle(groupKey)

          return (
            <div key={groupKey} className="relative">
              {/* Date header with timeline marker */}
              <div className="sticky top-0 z-10 bg-white py-3 mb-2 sm:pl-20">
                {/* Timeline circle marker (hidden on mobile) */}
                <div
                  className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 bg-rose-500 rounded-full border-4 border-white shadow-md hidden sm:flex items-center justify-center"
                  aria-hidden="true"
                >
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>

                {/* Date group title */}
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {groupKey === 'pinned' && <span className="text-xl">📌</span>}
                  {groupTitle}
                  <span className="text-sm font-normal text-gray-500">
                    ({groupNotes.length})
                  </span>
                </h2>
              </div>

              {/* Notes in this group */}
              <div className="sm:pl-20 space-y-0">
                {groupNotes.map((note) => (
                  <div key={note.id} className="relative group">
                    <NoteFeedItem
                      note={note}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onPin={onPin}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
