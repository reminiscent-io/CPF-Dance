'use client'

import { useState, useRef } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { NotesRichTextEditor, Editor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import type { CreateNoteData, NoteVisibility } from '@/lib/types'

interface Student {
  id: string
  full_name?: string | null
  profile?: {
    full_name: string
  }
}

interface AddNoteModalProps {
  students: Student[]
  onClose: () => void
  onSubmit: (data: CreateNoteData) => void
  initialStudentId?: string
  initialClassId?: string
}

export function AddNoteModal({
  students,
  onClose,
  onSubmit,
  initialStudentId,
  initialClassId
}: AddNoteModalProps) {
  const [formData, setFormData] = useState<CreateNoteData>({
    student_id: initialStudentId || '',
    class_id: initialClassId || undefined,
    title: '',
    content: '',
    tags: [],
    visibility: 'shared_with_student'
  })
  const editorRef = useRef<Editor | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formatting, setFormatting] = useState(false)
  const [previousContent, setPreviousContent] = useState<string | null>(null)

  const availableTags = ['technique', 'performance', 'improvement', 'attendance', 'behavior', 'progress', 'injury']

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag]
    }))
  }

  const handleVoiceTranscript = (html: string) => {
    if (editorRef.current) {
      editorRef.current.chain().focus().insertContent(html).run()
      setFormData(prev => ({ ...prev, content: editorRef.current?.getHTML() || prev.content }))
    } else {
      setFormData(prev => ({
        ...prev,
        content: prev.content && prev.content !== '<p></p>'
          ? `${prev.content}${html}`
          : html
      }))
    }
  }

  const handleEditorReady = (editor: Editor) => {
    editorRef.current = editor
  }

  const handleFormatWithAI = async () => {
    if (!formData.content.trim() || formData.content === '<p></p>') {
      alert('Please add some content before formatting')
      return
    }

    setFormatting(true)
    setPreviousContent(formData.content)

    try {
      const response = await fetch('/api/notes/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: formData.content })
      })

      if (!response.ok) {
        throw new Error('Failed to format note')
      }

      const { formattedContent } = await response.json()
      
      if (editorRef.current) {
        editorRef.current.commands.setContent(formattedContent)
      }
      setFormData(prev => ({ ...prev, content: formattedContent }))
    } catch (error) {
      console.error('Error formatting note:', error)
      alert('Failed to format note. Please try again.')
      setPreviousContent(null)
    } finally {
      setFormatting(false)
    }
  }

  const handleUndoFormat = () => {
    if (previousContent) {
      if (editorRef.current) {
        editorRef.current.commands.setContent(previousContent)
      }
      setFormData(prev => ({ ...prev, content: previousContent }))
      setPreviousContent(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.student_id || !formData.content) {
      return
    }
    setSubmitting(true)
    onSubmit(formData)
  }

  // Get student display name
  const getStudentName = (student: Student) => {
    return student.full_name || student.profile?.full_name || 'Unknown'
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Note" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              disabled={!!initialStudentId}
            >
              <option value="">Select a student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {getStudentName(student)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Content *
              </label>
              <div className="flex items-center gap-2">
                {previousContent && (
                  <button
                    type="button"
                    onClick={handleUndoFormat}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Undo
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleFormatWithAI}
                  disabled={formatting || !formData.content.trim() || formData.content === '<p></p>'}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {formatting ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Formatting...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Format with AI
                    </>
                  )}
                </button>
              </div>
            </div>
            <NotesRichTextEditor
              content={formData.content}
              onChange={(html) => setFormData({ ...formData, content: html })}
              onEditorReady={handleEditorReady}
              placeholder="Write your note here... Use formatting to highlight key points."
              minHeight="150px"
            />
            <div className="mt-3">
              <VoiceRecorder
                onTranscriptReady={handleVoiceTranscript}
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    formData.tags?.includes(tag)
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as NoteVisibility })}
            >
              <option value="private">Private (Only me)</option>
              <option value="shared_with_student">Shared with Student</option>
              <option value="shared_with_guardian">Shared with Guardian</option>
              <option value="shared_with_studio">Shared with Studio</option>
            </select>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Note'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
