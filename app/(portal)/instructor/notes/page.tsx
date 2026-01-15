'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Badge, Modal, ModalFooter, Input, useToast, Spinner } from '@/components/ui'
import { NotesRichTextEditor, RichTextDisplay, Editor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { AddNoteModal } from '@/components/AddNoteModal'
import { EllipsisVerticalIcon, FunnelIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { Note, Student, CreateNoteData, NoteVisibility } from '@/lib/types'

interface NoteActionsMenuProps {
  onEdit: () => void
  onDelete: () => void
}

function NoteActionsMenu({ onEdit, onDelete }: NoteActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative flex-shrink-0" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Note actions"
        aria-expanded={isOpen}
      >
        <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <button
            onClick={() => {
              onEdit()
              setIsOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => {
              onDelete()
              setIsOpen(false)
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function NotesPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [notes, setNotes] = useState<Note[]>([])
  const [studentNotes, setStudentNotes] = useState<Note[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classes, setClasses] = useState<Array<{ id: string; title: string; start_time: string }>>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [activeTab, setActiveTab] = useState<'my-notes' | 'student-notes'>('my-notes')
  const [filterStudent, setFilterStudent] = useState<string>('')
  const [filterVisibility, setFilterVisibility] = useState<NoteVisibility | ''>('')
  const [filterTag, setFilterTag] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchNotes()
      fetchStudentNotes()
      fetchStudents()
      fetchClasses()
    }
  }, [user?.id, filterStudent, filterVisibility, filterTag, activeTab])

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams()
      if (filterStudent) params.append('student_id', filterStudent)
      if (filterVisibility) params.append('visibility', filterVisibility)
      if (filterTag) params.append('tag', filterTag)
      
      const response = await fetch(`/api/notes?${params}`)
      if (!response.ok) throw new Error('Failed to fetch notes')
      
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
      addToast('Failed to load notes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentNotes = async () => {
    try {
      const params = new URLSearchParams()
      params.append('visibility', 'shared_with_instructor')
      
      const response = await fetch(`/api/notes?${params}`)
      if (!response.ok) throw new Error('Failed to fetch student notes')
      
      const data = await response.json()
      setStudentNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching student notes:', error)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students?is_active=true')
      if (!response.ok) throw new Error('Failed to fetch students')

      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes')
      if (!response.ok) throw new Error('Failed to fetch classes')

      const data = await response.json()
      setClasses(data.classes || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const handleAddNote = async (formData: CreateNoteData) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to create note')

      const { note } = await response.json()
      setNotes(prev => [note, ...prev])
      setShowAddModal(false)
      addToast('Note added successfully', 'success')
    } catch (error) {
      console.error('Error adding note:', error)
      addToast('Failed to add note', 'error')
    }
  }

  const handleEditNote = (note: Note) => {
    setEditingNote(note)
    setShowEditModal(true)
  }

  const handleUpdateNote = async (formData: CreateNoteData) => {
    if (!editingNote) return

    try {
      const response = await fetch('/api/instructor/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNote.id,
          ...formData
        })
      })

      if (!response.ok) throw new Error('Failed to update note')

      await fetchNotes()
      setShowEditModal(false)
      setEditingNote(null)
      addToast('Note updated successfully', 'success')
    } catch (error) {
      console.error('Error updating note:', error)
      addToast('Failed to update note', 'error')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/instructor/notes?id=${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete note')

      setNotes(prev => prev.filter(n => n.id !== noteId))
      addToast('Note deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting note:', error)
      addToast('Failed to delete note', 'error')
    }
  }

  if (authLoading || !profile || profile.role !== 'instructor' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  const availableTags = ['technique', 'performance', 'improvement', 'attendance', 'behavior', 'progress', 'injury']
  const displayNotes = activeTab === 'student-notes' ? studentNotes : notes
  const studentNotesCount = studentNotes.length

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notes</h1>
          <p className="text-gray-600">Track student progress and observations</p>
        </div>
        {activeTab === 'my-notes' && (
          <Button onClick={() => setShowAddModal(true)} aria-label="Add Note">
            <PlusIcon className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('my-notes')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'my-notes'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              My Notes
            </button>
            <button
              onClick={() => setActiveTab('student-notes')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === 'student-notes'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Student Notes ({studentNotesCount})
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'my-notes' && (
        <div className="mb-6">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 mb-4"
            >
              {showFilters ? (
                <>
                  <XMarkIcon className="w-4 h-4" />
                  Hide Filters
                </>
              ) : (
                <>
                  <FunnelIcon className="w-4 h-4" />
                  Show Filters
                  {(filterStudent || filterVisibility || filterTag) && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-rose-100 text-rose-600 rounded-full">
                      {[filterStudent, filterVisibility, filterTag].filter(Boolean).length}
                    </span>
                  )}
                </>
              )}
            </button>
            
            <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-4`}>
              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                value={filterStudent}
                onChange={(e) => setFilterStudent(e.target.value)}
              >
                <option value="">All Students</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.profile?.full_name}
                  </option>
                ))}
              </select>

              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                value={filterVisibility}
                onChange={(e) => setFilterVisibility(e.target.value as NoteVisibility | '')}
              >
                <option value="">All Visibility</option>
                <option value="private">Private</option>
                <option value="shared_with_student">Shared with Student</option>
                <option value="shared_with_guardian">Shared with Guardian</option>
                <option value="shared_with_studio">Shared with Studio</option>
              </select>

              <select
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {availableTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
        )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : displayNotes.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-600">
            {activeTab === 'student-notes' 
              ? 'No student notes shared with you yet' 
              : 'No notes found'}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayNotes.map((note: any) => (
            <Card key={note.id} hover className="p-4 sm:p-6">
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{note.title || 'Untitled Note'}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-sm text-gray-600">
                    <span className="truncate">{note.student?.profile?.full_name}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 whitespace-nowrap">
                      {note.visibility.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                {activeTab === 'my-notes' && (
                  <NoteActionsMenu
                    onEdit={() => handleEditNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                )}
              </div>

              <RichTextDisplay content={note.content} className="text-gray-700 mb-3 text-sm sm:text-base" />

              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {note.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="primary" size="sm">{tag}</Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddNoteModal
          students={students}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddNote}
        />
      )}

      {showEditModal && editingNote && (
        <EditNoteModal
          note={editingNote}
          students={students}
          classes={classes}
          onClose={() => {
            setShowEditModal(false)
            setEditingNote(null)
          }}
          onSubmit={handleUpdateNote}
        />
      )}
    </PortalLayout>
  )
}

interface EditNoteModalProps {
  note: Note
  students: Student[]
  classes: Array<{ id: string; title: string; start_time: string }>
  onClose: () => void
  onSubmit: (data: CreateNoteData) => void
}

function EditNoteModal({ note, students, classes, onClose, onSubmit }: EditNoteModalProps) {
  const [formData, setFormData] = useState<CreateNoteData>({
    student_id: (note as any).student_id || '',
    class_id: (note as any).class_id || '',
    title: note.title || '',
    content: note.content || '',
    tags: note.tags || [],
    visibility: note.visibility || 'private'
  })

  // Helper to get student display name
  const getStudentName = (student: Student) => {
    return student.full_name || student.profile?.full_name || 'Unknown'
  }
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
    if (!formData.content) {
      return
    }
    setSubmitting(true)
    onSubmit(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Note" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Student
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
            >
              <option value="">No student selected</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {getStudentName(student)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Related Class
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.class_id || ''}
              onChange={(e) => setFormData({ ...formData, class_id: e.target.value || undefined })}
            >
              <option value="">No class selected</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.title} - {new Date(cls.start_time).toLocaleDateString()}
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
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
