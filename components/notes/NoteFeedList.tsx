'use client'

import { NoteFeedItem } from './NoteFeedItem'
import {
  groupNotesByDate,
  getDateGroupTitle,
  getDateGroupKeys,
  Note
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

  const nonEmptyGroups = groupKeys.filter(
    (key) => groupedNotes[key]?.length > 0
  )

  if (nonEmptyGroups.length === 0) {
    return (
      <div className="py-20 max-w-prose">
        <p className="font-serif text-2xl italic text-charcoal-500 leading-snug tracking-[-0.01em]">
          Nothing here yet.
        </p>
        <p className="mt-3 text-sm text-charcoal-500 max-w-prose">
          Notes from Courtney will appear after a lesson, alongside anything you write
          for yourself between sessions.
        </p>
      </div>
    )
  }

  return (
    <div>
      {nonEmptyGroups.map((groupKey, groupIdx) => {
        const groupNotes = groupedNotes[groupKey]
        const groupTitle = getDateGroupTitle(groupKey)
        const isFirst = groupIdx === 0

        return (
          <section
            key={groupKey}
            className={isFirst ? '' : 'mt-12'}
            aria-labelledby={`note-group-${groupKey}`}
          >
            <h2
              id={`note-group-${groupKey}`}
              className="font-serif italic text-charcoal-950 text-xl tracking-[-0.01em] pb-3 mb-4 border-b border-champagne-200"
            >
              {groupTitle}
            </h2>

            <div className="flex flex-col gap-3">
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
          </section>
        )
      })}
    </div>
  )
}
