'use client'

import { useState } from 'react'
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
  const [editor, setEditor] = useState<Editor | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    if (editor) {
      editor.chain().focus().insertContent(html).run()
      setFormData(prev => ({ ...prev, content: editor.getHTML() }))
    } else {
      setFormData(prev => ({
        ...prev,
        content: prev.content && prev.content !== '<p></p>'
          ? `${prev.content}${html}`
          : html
      }))
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content *
            </label>
            <NotesRichTextEditor
              content={formData.content}
              onChange={(html) => setFormData({ ...formData, content: html })}
              onEditorReady={setEditor}
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
