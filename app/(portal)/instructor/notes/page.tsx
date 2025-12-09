'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Badge, Modal, ModalFooter, Input, useToast, Spinner } from '@/components/ui'
import { NotesRichTextEditor, RichTextDisplay } from '@/components/NotesRichTextEditor'
import type { Note, Student, CreateNoteData, NoteVisibility } from '@/lib/types'

export default function NotesPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [notes, setNotes] = useState<Note[]>([])
  const [studentNotes, setStudentNotes] = useState<Note[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [activeTab, setActiveTab] = useState<'my-notes' | 'student-notes'>('my-notes')
  const [filterStudent, setFilterStudent] = useState<string>('')
  const [filterVisibility, setFilterVisibility] = useState<NoteVisibility | ''>('')
  const [filterTag, setFilterTag] = useState<string>('')

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
    }
  }, [user, filterStudent, filterVisibility, filterTag, activeTab])

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
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notes</h1>
            <p className="text-gray-600 mt-1">Track student progress and observations</p>
          </div>
          {activeTab === 'my-notes' && (
            <Button onClick={() => setShowAddModal(true)}>
              Add Note
            </Button>
          )}
        </div>

        <div className="border-b border-gray-200 mb-6">
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

        {activeTab === 'my-notes' && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        )}
      </div>

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
            <Card key={note.id} hover>
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{note.title || 'Untitled Note'}</h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <span>{note.student?.profile?.full_name}</span>
                    <span>•</span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{note.visibility.replace(/_/g, ' ')}</Badge>
                  {activeTab === 'my-notes' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <RichTextDisplay content={note.content} className="text-gray-700 mb-3" />

              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
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

interface AddNoteModalProps {
  students: Student[]
  onClose: () => void
  onSubmit: (data: CreateNoteData) => void
}

function AddNoteModal({ students, onClose, onSubmit }: AddNoteModalProps) {
  const [formData, setFormData] = useState<CreateNoteData>({
    student_id: '',
    title: '',
    content: '',
    tags: [],
    visibility: 'private'
  })

  const availableTags = ['technique', 'performance', 'improvement', 'attendance', 'behavior', 'progress', 'injury']

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.student_id || !formData.content) {
      return
    }
    onSubmit(formData)
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
            >
              <option value="">Select a student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.profile?.full_name}
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
              placeholder="Write your note here... Use formatting to highlight key points."
              minHeight="150px"
            />
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Note</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

interface EditNoteModalProps {
  note: Note
  onClose: () => void
  onSubmit: (data: CreateNoteData) => void
}

function EditNoteModal({ note, onClose, onSubmit }: EditNoteModalProps) {
  const [formData, setFormData] = useState<CreateNoteData>({
    student_id: (note as any).student_id || '',
    title: note.title || '',
    content: note.content || '',
    tags: note.tags || [],
    visibility: note.visibility || 'private'
  })

  const availableTags = ['technique', 'performance', 'improvement', 'attendance', 'behavior', 'progress', 'injury']

  const toggleTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...(prev.tags || []), tag]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.content) {
      return
    }
    onSubmit(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Note" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              Student: <span className="font-medium text-gray-900">{(note as any).student?.profile?.full_name || 'Unknown'}</span>
            </p>
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
              placeholder="Write your note here... Use formatting to highlight key points."
              minHeight="150px"
            />
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
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
