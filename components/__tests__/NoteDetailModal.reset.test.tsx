import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/tests/utils'
import { NoteDetailModal, type DetailNote } from '@/components/NoteDetailModal'

const noteA: DetailNote = {
  id: 'a',
  title: 'Fouetté prep',
  content: '<p>spotting</p>',
  tags: null,
  visibility: 'shared_with_instructor',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  author_id: 'u1',
  class_id: null,
  personal_class_id: null,
}

const noteB: DetailNote = {
  ...noteA,
  id: 'b',
  title: 'Ankle soreness',
  content: '<p>watch loading</p>',
}

function renderNote(note: DetailNote) {
  return render(
    <NoteDetailModal
      key={note.id}
      note={note}
      isOwn
      onClose={vi.fn()}
      onBack={vi.fn()}
      onSaved={vi.fn()}
    />
  )
}

describe('NoteDetailModal', () => {
  it('shows the note it was given', () => {
    renderNote(noteA)
    expect(screen.getByText('Fouetté prep')).toBeInTheDocument()
  })

  it('shows the new note when a different one is swapped in', () => {
    const { rerender } = renderNote(noteA)
    rerender(
      <NoteDetailModal
        key={noteB.id}
        note={noteB}
        isOwn
        onClose={vi.fn()}
        onBack={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    expect(screen.getByText('Ankle soreness')).toBeInTheDocument()
    expect(screen.queryByText('Fouetté prep')).not.toBeInTheDocument()
  })
})
