'use client'

import { Badge, Button } from '@/components/ui'
import type { DetailNote } from '@/components/NoteDetailModal'
import { noteRowTitle, noteVisibilityLabel } from '@/lib/utils/lesson-notes'

/** A note as /api/notes returns it: the detail fields plus who it's about. */
export interface ClassNote extends DetailNote {
  student?: {
    full_name?: string | null
    profile?: { full_name?: string | null } | null
  } | null
}

interface ClassNotesSectionProps {
  notes: ClassNote[] | null
  loading: boolean
  error: string | null
  addLabel: string
  onAdd: () => void
  onOpen: (note: ClassNote) => void
}

function studentName(note: ClassNote): string | null {
  return note.student?.full_name || note.student?.profile?.full_name || null
}

/**
 * The notes tied to one class, listed in the Classes edit modal with a button
 * to write another. Modals for adding and reading notes live with the caller,
 * which hides the edit modal while one is open so the two never stack.
 */
export function ClassNotesSection({
  notes,
  loading,
  error,
  addLabel,
  onAdd,
  onOpen,
}: ClassNotesSectionProps) {
  const list = notes ?? []

  return (
    <section className="p-4 bg-champagne-100/60 border border-champagne-200 rounded-lg space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-charcoal-700">
          Notes{list.length > 0 && <span className="text-charcoal-500 font-normal"> · {list.length}</span>}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          {addLabel}
        </Button>
      </div>

      {loading && list.length === 0 ? (
        <p className="text-sm text-charcoal-500">Loading notes…</p>
      ) : error ? (
        <p className="text-sm text-ballet-pink-800">Couldn&apos;t load notes for this class.</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-charcoal-500">No notes tied to this class yet.</p>
      ) : (
        <ul className="rounded-lg border border-champagne-200 divide-y divide-champagne-200 overflow-hidden">
          {list.map(note => {
            const name = studentName(note)
            return (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onOpen(note)}
                  className="w-full text-left px-4 py-2.5 bg-champagne-50 hover:bg-champagne-100 transition-colors flex items-baseline justify-between gap-3"
                >
                  <span className="min-w-0">
                    <span className="block text-sm text-charcoal-900 truncate">{noteRowTitle(note)}</span>
                    {name && <span className="block text-xs text-charcoal-500 mt-0.5 truncate">{name}</span>}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <Badge className="bg-champagne-100 text-charcoal-700 border-champagne-200">
                      {noteVisibilityLabel(note.visibility)}
                    </Badge>
                    <span className="text-xs text-charcoal-500">
                      {new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
