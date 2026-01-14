'use client'

import { useState } from 'react'
import { Modal, ModalFooter, Button, Input } from '@/components/ui'
import { NotesRichTextEditor, Editor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'

interface ClassInfo {
  id: string
  title: string
  type: 'enrolled' | 'personal'
  start_time?: string
  instructorName?: string
}

interface DancerAddNoteModalProps {
  onClose: () => void
  onSubmit: (data: {
    title: string
    content: string
    tags: string[]
    visibility: 'private' | 'shared_with_instructor'
    class_id?: string
    personal_class_id?: string
  }) => Promise<void>
  initialClass?: ClassInfo
  availableClasses?: ClassInfo[]
}

export function DancerAddNoteModal({
  onClose,
  onSubmit,
  initialClass,
  availableClasses = []
}: DancerAddNoteModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [visibility, setVisibility] = useState<'private' | 'shared_with_instructor'>('private')
  const [selectedClassId, setSelectedClassId] = useState(initialClass?.id || '')
  const [selectedClassType, setSelectedClassType] = useState<'enrolled' | 'personal' | ''>(initialClass?.type || '')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const availableTags = ['practice', 'technique', 'choreography', 'performance', 'progress', 'goals', 'reflection']

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleVoiceTranscript = (html: string) => {
    if (editor) {
      editor.chain().focus().insertContent(html).run()
      setContent(editor.getHTML())
    } else {
      setContent(prev =>
        prev && prev !== '<p></p>'
          ? `${prev}${html}`
          : html
      )
    }
  }

  const handleClassChange = (value: string) => {
    if (!value) {
      setSelectedClassId('')
      setSelectedClassType('')
      return
    }

    // Parse the compound value (type:id)
    const [type, id] = value.split(':')
    setSelectedClassId(id)
    setSelectedClassType(type as 'enrolled' | 'personal')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      alert('Please add some content to your note')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        content,
        tags,
        visibility,
        class_id: selectedClassType === 'enrolled' ? selectedClassId : undefined,
        personal_class_id: selectedClassType === 'personal' ? selectedClassId : undefined
      })
      onClose()
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note')
    } finally {
      setSubmitting(false)
    }
  }

  const formatClassDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  // Build compound value for select
  const getSelectValue = () => {
    if (!selectedClassId || !selectedClassType) return ''
    return `${selectedClassType}:${selectedClassId}`
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Note" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Class selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link to Class (optional)
            </label>
            {initialClass ? (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="font-medium text-gray-900">{initialClass.title}</p>
                <p className="text-sm text-gray-500">
                  {formatClassDate(initialClass.start_time)}
                  {initialClass.instructorName && ` with ${initialClass.instructorName}`}
                </p>
              </div>
            ) : availableClasses.length > 0 ? (
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={getSelectValue()}
                onChange={(e) => handleClassChange(e.target.value)}
              >
                <option value="">No class linked</option>
                <optgroup label="Enrolled Classes">
                  {availableClasses
                    .filter(c => c.type === 'enrolled')
                    .map(c => (
                      <option key={`enrolled:${c.id}`} value={`enrolled:${c.id}`}>
                        {c.title} - {formatClassDate(c.start_time)}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Personal Classes">
                  {availableClasses
                    .filter(c => c.type === 'personal')
                    .map(c => (
                      <option key={`personal:${c.id}`} value={`personal:${c.id}`}>
                        {c.title} - {formatClassDate(c.start_time)}
                      </option>
                    ))}
                </optgroup>
              </select>
            ) : (
              <p className="text-sm text-gray-500 italic">No classes available to link</p>
            )}
          </div>

          {/* Title */}
          <Input
            label="Title (optional)"
            placeholder="Give your note a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content *
            </label>
            <NotesRichTextEditor
              content={content}
              onChange={setContent}
              onEditorReady={setEditor}
              placeholder="Write your thoughts, observations, or reflections..."
              minHeight="150px"
            />
            <div className="mt-3">
              <VoiceRecorder
                onTranscriptReady={handleVoiceTranscript}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Tags */}
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
                    tags.includes(tag)
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Visibility
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'private' | 'shared_with_instructor')}
            >
              <option value="private">Private (Only me)</option>
              <option value="shared_with_instructor">Shared with Instructor</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {visibility === 'private'
                ? 'Only you can see this note'
                : 'Your instructor will be able to read this note'}
            </p>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !content.trim()}>
            {submitting ? 'Saving...' : 'Save Note'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
