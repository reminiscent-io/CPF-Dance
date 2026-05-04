'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Note } from '@/lib/utils/date-helpers'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

export interface NoteViewContentProps {
  note: Note
  currentUserName?: string
  footerSlot?: React.ReactNode
}

export function NoteViewContent({
  note,
  currentUserName,
  footerSlot
}: NoteViewContentProps) {
  const isInstructor = !note.is_personal
  const authorName =
    (note as any).author_name ||
    (isInstructor ? 'Courtney' : currentUserName) ||
    'You'
  const authorAvatarUrl = (note as any).author_avatar_url || null

  const linkedClass =
    (note as any).classes || (note as any).personal_classes
  const classTitle = linkedClass?.title
  const classStartTime = linkedClass?.start_time

  const formattedDate = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div>
      <header className="flex items-center gap-3 mb-5">
        <Avatar src={authorAvatarUrl} name={authorName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-charcoal-900 truncate">
            {authorName}
          </div>
          <div className="text-xs italic text-charcoal-500">{formattedDate}</div>
        </div>
      </header>

      {note.title && (
        <h3 className="font-serif text-2xl sm:text-3xl text-charcoal-950 leading-snug tracking-[-0.02em] mb-2">
          {note.title}
        </h3>
      )}

      {classTitle && (
        <p className="italic text-xs text-charcoal-500 mb-5">
          {classTitle}
          {classStartTime && (
            <>
              {' · '}
              {new Date(classStartTime).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </>
          )}
        </p>
      )}

      <div
        className={`prose prose-sm max-w-[68ch] text-charcoal-800 rich-text-preview ${
          note.title || classTitle ? '' : 'mt-2'
        }`}
        dangerouslySetInnerHTML={createSanitizedHtml(note.content)}
      />

      {note.tags && note.tags.length > 0 && (
        <div className="mt-6 pt-4 border-t border-champagne-200 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs uppercase tracking-[0.14em] text-charcoal-500">
          {note.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      {footerSlot && (
        <div className="mt-6 pt-4 border-t border-champagne-200 flex items-center justify-end gap-3">
          {footerSlot}
        </div>
      )}
    </div>
  )
}
