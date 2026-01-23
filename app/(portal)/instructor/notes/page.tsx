'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Badge, Modal, ModalFooter, Input, useToast, Spinner, Avatar } from '@/components/ui'
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

function NotesContent() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
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

  // Check for create query parameter to auto-open add modal
  useEffect(() => {
    if (!searchParams) return

    const shouldCreate = searchParams.get('create')
    if (shouldCreate === 'true' && !showAddModal) {
      setShowAddModal(true)
      // Clear the query parameter after opening modal
      router.replace('/instructor/notes', { scroll: false })
    }
  }, [searchParams, showAddModal, router])

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

  // Helper to get student name from note
  const getStudentName = (note: any) => {
    // Handle profile which may be an array or single object
    const studentProfile = Array.isArray(note.student?.profile)
      ? note.student.profile[0]
      : note.student?.profile
    return studentProfile?.full_name || note.student?.full_name || 'Unknown Student'
  }

  // Helper to get student avatar URL
  const getStudentAvatarUrl = (note: any) => {
    const studentProfile = Array.isArray(note.student?.profile)
      ? note.student.profile[0]
      : note.student?.profile
    return studentProfile?.avatar_url || null
  }

  // Helper to get author name
  const getAuthorName = (note: any) => {
    return note.author?.full_name || 'Unknown'
  }

  // Helper to get author avatar URL
  const getAuthorAvatarUrl = (note: any) => {
    return note.author?.avatar_url || null
  }

  // Helper to format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Helper to get visibility label and color
  const getVisibilityInfo = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return { label: 'Private', variant: 'default' as const }
      case 'shared_with_student':
        return { label: 'Shared with Student', variant: 'success' as const }
      case 'shared_with_guardian':
        return { label: 'Shared with Guardian', variant: 'warning' as const }
      case 'shared_with_studio':
        return { label: 'Shared with Studio', variant: 'secondary' as const }
      case 'shared_with_instructor':
        return { label: 'Shared with You', variant: 'primary' as const }
      default:
        return { label: visibility.replace(/_/g, ' '), variant: 'default' as const }
    }
  }

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
          <nav className="-mb-px flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveTab('my-notes')}
              className={`
                py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
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
                py-3 sm:py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
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
                    {student.profile?.full_name || student.full_name || 'Unknown'}
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
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'student-notes'
                ? 'No Student Notes Yet'
                : 'No Notes Found'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {activeTab === 'student-notes'
                ? 'Students haven\'t shared any notes with you yet.'
                : filterStudent || filterVisibility || filterTag
                  ? 'Try adjusting your filters to see more results.'
                  : 'Create your first note to start tracking student progress.'}
            </p>
            {activeTab === 'my-notes' && (filterStudent || filterVisibility || filterTag) && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStudent('')
                  setFilterVisibility('')
                  setFilterTag('')
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayNotes.map((note: any) => {
            const studentName = getStudentName(note)
            const studentAvatarUrl = getStudentAvatarUrl(note)
            const authorName = getAuthorName(note)
            const authorAvatarUrl = getAuthorAvatarUrl(note)
            const visibilityInfo = getVisibilityInfo(note.visibility)
            const isStudentNote = activeTab === 'student-notes'

            return (
              <div
                key={note.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:shadow-sm transition-all"
              >
                {/* Header Row: Avatars + Author/Student info + Time + Menu */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar section */}
                    {isStudentNote ? (
                      /* Student notes: show student avatar (they wrote it) */
                      <Avatar
                        src={studentAvatarUrl}
                        name={studentName}
                        size="md"
                      />
                    ) : (
                      /* My notes: show both author and student avatars */
                      <div className="flex items-center">
                        <Avatar
                          src={authorAvatarUrl}
                          name={authorName}
                          size="md"
                        />
                        <div className="flex items-center -ml-2">
                          <svg className="w-4 h-4 text-gray-400 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          <Avatar
                            src={studentAvatarUrl}
                            name={studentName}
                            size="md"
                          />
                        </div>
                      </div>
                    )}

                    {/* Name and time */}
                    <div>
                      {isStudentNote ? (
                        <>
                          <div className="font-medium text-gray-900 text-sm">
                            {studentName}
                          </div>
                          <div className="text-xs text-gray-500">
                            shared with you • {getRelativeTime(note.created_at)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="font-medium text-gray-900 text-sm">
                            Note for {studentName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getRelativeTime(note.created_at)}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions menu (only for my-notes) */}
                  {activeTab === 'my-notes' && (
                    <NoteActionsMenu
                      onEdit={() => handleEditNote(note)}
                      onDelete={() => handleDeleteNote(note.id)}
                    />
                  )}
                </div>

                {/* Title */}
                {note.title && (
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {note.title}
                  </h3>
                )}

                {/* Linked class info */}
                {(note.class || note.classes) && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>
                      {(note.class || note.classes)?.title}
                      {(note.class || note.classes)?.start_time && (
                        <span className="text-gray-400 ml-1">
                          ({new Date((note.class || note.classes).start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Content preview */}
                <div className="prose prose-sm max-w-none mb-3">
                  <RichTextDisplay
                    content={note.content}
                    className="text-gray-600 text-sm line-clamp-3"
                  />
                </div>

                {/* Footer Row: Visibility Badge + Tags */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Visibility badge */}
                  <Badge variant={visibilityInfo.variant} size="sm">
                    {visibilityInfo.label}
                  </Badge>

                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {note.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="default" size="sm">
                          {tag}
                        </Badge>
                      ))}
                      {note.tags.length > 3 && (
                        <Badge variant="default" size="sm">
                          +{note.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
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

  const getStudentName = (student: Student) => {
    return student.full_name || student.profile?.full_name || 'Unknown'
  }
  const [editor, setEditor] = useState<Editor | null>(null)
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
      
      if (editor) {
        editor.commands.setContent(formattedContent)
      }
      setFormData({ ...formData, content: formattedContent })
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
      if (editor) {
        editor.commands.setContent(previousContent)
      }
      setFormData({ ...formData, content: previousContent })
      setPreviousContent(null)
    }
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

export default function NotesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    }>
      <NotesContent />
    </Suspense>
  )
}
