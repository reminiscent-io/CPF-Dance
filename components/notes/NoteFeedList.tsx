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
  onChangeVisibility?: (noteId: string) => void
  currentUserName?: string
}

export function NoteFeedList({
  notes,
  onEdit,
  onDelete,
  onChangeVisibility,
  currentUserName
}: NoteFeedListProps) {
  const groupedNotes = groupNotesByDate(notes)
  const groupKeys = getDateGroupKeys(groupedNotes)

  // Filter out empty groups and the pinned group (no longer used)
  const nonEmptyGroups = groupKeys.filter(
    key => key !== 'pinned' && groupedNotes[key]?.length > 0
  )

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
    <div className="space-y-8">
      {nonEmptyGroups.map((groupKey) => {
        const groupNotes = groupedNotes[groupKey]
        const groupTitle = getDateGroupTitle(groupKey)

        return (
          <div key={groupKey}>
            {/* Date header - simple italic text */}
            <div className="mb-4">
              <h2 className="text-base italic text-gray-500">
                {groupTitle}
              </h2>
            </div>

            {/* Notes in this group */}
            <div className="space-y-3">
              {groupNotes.map((note) => (
                <NoteFeedItem
                  key={note.id}
                  note={note}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onChangeVisibility={onChangeVisibility}
                  currentUserName={currentUserName}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
