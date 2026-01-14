'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Editor } from '@tiptap/react'
import { NotesRichTextEditor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Note } from '@/lib/utils/date-helpers'

interface ClassOption {
  id: string
  title: string
  start_time: string
  type: 'enrolled' | 'personal'
}

interface NoteFocusModeProps {
  note: Note | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: { title: string; content: string; tags: string[] }) => void
  // Optional class linking props
  classes?: ClassOption[]
  selectedClassId?: string
  selectedClassType?: 'enrolled' | 'personal' | ''
  onClassChange?: (classId: string, classType: 'enrolled' | 'personal' | '') => void
  // Optional visibility props
  isPrivate?: boolean
  onVisibilityChange?: (isPrivate: boolean) => void
}

export function NoteFocusMode({
  note,
  isOpen,
  onClose,
  onSave,
  classes = [],
  selectedClassId = '',
  selectedClassType = '',
  onClassChange,
  isPrivate = false,
  onVisibilityChange
}: NoteFocusModeProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)
  const editorRef = useRef<Editor | null>(null)

  const formatClassDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const handleClassSelect = (value: string) => {
    if (!onClassChange) return

    if (!value) {
      onClassChange('', '')
      return
    }

    const [type, id] = value.split(':')
    onClassChange(id, type as 'enrolled' | 'personal')
  }

  const getClassSelectValue = () => {
    if (!selectedClassId || !selectedClassType) return ''
    return `${selectedClassType}:${selectedClassId}`
  }

  // Initialize form with note data when opening
  useEffect(() => {
    if (isOpen) {
      if (note) {
        setTitle(note.title || '')
        setContent(note.content)
        setTagsInput(note.tags?.join(', ') || '')
      } else {
        setTitle('')
        setContent('')
        setTagsInput('')
      }
    }
  }, [isOpen, note])

  // Prevent body scroll when focus mode is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Please add some content to your note')
      return
    }

    setSaving(true)
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)

      await onSave({ title: title.trim(), content, tags })
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  const handleEditorReady = (editor: Editor) => {
    editorRef.current = editor
  }

  const handleVoiceTranscript = (html: string) => {
    if (editorRef.current) {
      // Insert at cursor position
      editorRef.current.chain().focus().insertContent(html).run()
    } else {
      // Fallback: append to existing content
      setContent(prev => prev + html)
    }
  }

  const handleCancel = () => {
    // Ask for confirmation if there's unsaved content
    if (content.trim() && content !== (note?.content || '')) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return
      }
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (desktop only) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="hidden md:block fixed inset-0 bg-black/50 z-40"
          />

          {/* Focus mode container */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-white md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-3xl md:w-full md:max-h-[90vh] md:rounded-lg md:shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {note ? 'Edit Note' : 'New Note'}
              </h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="text-sm px-3 py-1.5"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                  className="text-sm px-3 py-1.5"
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Title input */}
              <Input
                label="Title (optional)"
                placeholder="Give your note a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg"
              />

              {/* Rich text editor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content *
                </label>
                <NotesRichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your note... Share your thoughts, practice observations, or dance goals!"
                  minHeight="300px"
                  onEditorReady={handleEditorReady}
                />
              </div>

              {/* Voice recorder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Voice Recording
                </label>
                <VoiceRecorder
                  onTranscriptReady={handleVoiceTranscript}
                  disabled={saving}
                />
              </div>

              {/* Tags input */}
              <Input
                label="Tags"
                placeholder="e.g., technique, choreography, performance"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                helperText="Separate tags with commas"
              />

              {/* Class linking - only shown if classes are provided */}
              {classes.length > 0 && onClassChange && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link to Class (optional)
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    value={getClassSelectValue()}
                    onChange={(e) => handleClassSelect(e.target.value)}
                  >
                    <option value="">No class linked</option>
                    {classes.filter(c => c.type === 'enrolled').length > 0 && (
                      <optgroup label="Enrolled Classes">
                        {classes
                          .filter(c => c.type === 'enrolled')
                          .map(c => (
                            <option key={`enrolled:${c.id}`} value={`enrolled:${c.id}`}>
                              {c.title} - {formatClassDate(c.start_time)}
                            </option>
                          ))}
                      </optgroup>
                    )}
                    {classes.filter(c => c.type === 'personal').length > 0 && (
                      <optgroup label="Personal Classes">
                        {classes
                          .filter(c => c.type === 'personal')
                          .map(c => (
                            <option key={`personal:${c.id}`} value={`personal:${c.id}`}>
                              {c.title} - {formatClassDate(c.start_time)}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              )}

              {/* Visibility toggle - only shown if callback provided */}
              {onVisibilityChange && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Visibility
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    value={isPrivate ? 'private' : 'shared'}
                    onChange={(e) => onVisibilityChange(e.target.value === 'private')}
                  >
                    <option value="private">Private (Only me)</option>
                    <option value="shared">Shared with Instructor</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {isPrivate
                      ? 'Only you can see this note'
                      : 'Your instructor will be able to read this note'}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
