'use client'

import { useEffect, useState } from 'react'
import { ChevronLeftIcon, EyeIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { Button, Input, Modal, ModalFooter } from '@/components/ui'
import { Editor, NotesRichTextEditor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

export interface DetailNote {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  visibility: 'private' | 'shared_with_student' | 'shared_with_guardian' | 'shared_with_instructor'
  created_at: string
  updated_at: string
  author_id: string
  author_name?: string
  class_id: string | null
  personal_class_id: string | null
}

interface NoteDetailModalProps {
  note: DetailNote
  isOwn: boolean
  onClose: () => void
  onBack: () => void
  onSaved: (updated: DetailNote) => void
}

export function NoteDetailModal({
  note,
  isOwn,
  onClose,
  onBack,
  onSaved,
}: NoteDetailModalProps) {
  const [editMode, setEditMode] = useState(false)
  const [title, setTitle] = useState(note.title ?? '')
  const [content, setContent] = useState(note.content)
  const [visibility, setVisibility] = useState<'private' | 'shared_with_instructor'>(
    note.visibility === 'private' ? 'private' : 'shared_with_instructor'
  )
  const [editor, setEditor] = useState<Editor | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Local form state resets by remounting — every call site passes
  // key={note.id}, so a different note is a different component instance and
  // the useState initialisers above run again.

  const enterEdit = () => {
    setTitle(note.title ?? '')
    setContent(note.content)
    setVisibility(note.visibility === 'private' ? 'private' : 'shared_with_instructor')
    setEditMode(true)
  }

  const cancelEdit = () => {
    setEditMode(false)
  }

  const handleVoiceTranscript = (html: string) => {
    if (editor) {
      editor.chain().focus().insertContent(html).run()
      setContent(editor.getHTML())
    } else {
      setContent(prev => (prev && prev !== '<p></p>' ? `${prev}${html}` : html))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      alert('Please add some content')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/dancer/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          title: title.trim(),
          content,
          tags: note.tags ?? [],
          class_id: note.class_id,
          personal_class_id: note.personal_class_id,
          visibility,
        }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || 'Failed to update note')
      }
      const result = await response.json()
      const updated: DetailNote = {
        ...note,
        ...(result.note ?? {}),
        title: result.note?.title ?? title.trim(),
        content: result.note?.content ?? content,
        visibility: result.note?.visibility ?? visibility,
        updated_at: result.note?.updated_at ?? new Date().toISOString(),
      }
      onSaved(updated)
      setEditMode(false)
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to update note')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTimestamp = (iso: string) =>
    new Date(iso).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

  const headerTitle = editMode
    ? 'Editing note'
    : note.title?.trim() || 'Untitled note'

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      {/* Custom header — pulls flush with the modal edge so the back arrow
          reads as the primary navigation affordance, not body content. */}
      <div className="-mx-4 -mt-4 sm:-mx-6 sm:-mt-6 mb-4 flex items-center gap-2 border-b border-champagne-200 px-3 sm:px-5 py-3 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 rounded-full p-1.5 text-charcoal-500 transition-colors hover:bg-champagne-100 hover:text-charcoal-900"
          aria-label="Back to class details"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <h2
          className="flex-1 truncate text-xl sm:text-2xl font-semibold text-charcoal-950"
          style={{ fontFamily: 'var(--font-family-display)' }}
        >
          {headerTitle}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-charcoal-400 transition-colors hover:text-charcoal-700"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!editMode && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-charcoal-500">
            {!isOwn && note.author_name && (
              <>
                <span className="text-charcoal-700">{note.author_name}</span>
                <span className="text-charcoal-300">·</span>
              </>
            )}
            <span>{formatTimestamp(note.created_at)}</span>
            <span className="text-charcoal-300">·</span>
            {note.visibility === 'private' ? (
              <span className="inline-flex items-center gap-1">
                <LockClosedIcon className="w-3.5 h-3.5" aria-hidden="true" />
                Private
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <EyeIcon className="w-3.5 h-3.5" aria-hidden="true" />
                {isOwn ? 'Visible to your instructor' : 'Shared with you'}
              </span>
            )}
          </div>

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.map(tag => (
                <span
                  key={tag}
                  className="rounded-full bg-champagne-100 px-2 py-0.5 text-xs text-charcoal-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            className="prose prose-sm max-w-none text-charcoal-900 [&_blockquote]:border-l-2 [&_blockquote]:border-ballet-pink-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:mt-4 [&_h2]:mt-3 [&_p]:my-2"
            dangerouslySetInnerHTML={createSanitizedHtml(note.content)}
          />

          <ModalFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
            {isOwn && (
              <Button type="button" onClick={enterEdit}>
                Edit
              </Button>
            )}
          </ModalFooter>
        </div>
      )}

      {editMode && (
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title (optional)"
            placeholder="Give your note a title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-charcoal-700">
              Content *
            </label>
            <NotesRichTextEditor
              content={content}
              onChange={setContent}
              onEditorReady={setEditor}
              placeholder="Write your thoughts..."
              minHeight="180px"
            />
            <div className="mt-3">
              <VoiceRecorder onTranscriptReady={handleVoiceTranscript} disabled={submitting} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs text-charcoal-500">
            {visibility === 'shared_with_instructor' ? (
              <EyeIcon className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <LockClosedIcon className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>
              {visibility === 'shared_with_instructor'
                ? 'Visible to your instructor'
                : 'Private to you'}
            </span>
            <button
              type="button"
              onClick={() =>
                setVisibility(v => (v === 'private' ? 'shared_with_instructor' : 'private'))
              }
              className="ml-1 text-charcoal-700 underline decoration-champagne-300 underline-offset-4 transition-colors hover:text-charcoal-950 hover:decoration-charcoal-500"
            >
              {visibility === 'shared_with_instructor' ? 'Make private' : 'Share with instructor'}
            </button>
          </div>

          <ModalFooter className="mt-2">
            <Button type="button" variant="outline" onClick={cancelEdit} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !content.trim()}>
              {submitting ? 'Saving...' : 'Save changes'}
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  )
}
