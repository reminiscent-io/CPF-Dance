'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Modal,
  ModalFooter,
  PageHeader,
  SegmentedControl,
  Select,
  StatusDot,
  Toolbar,
  useToast,
  PageSkeleton,
  NoteListSkeleton,
  Avatar
} from '@/components/ui'
import { NotesRichTextEditor, RichTextDisplay, Editor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { AddNoteModal } from '@/components/AddNoteModal'
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { Note, Student, CreateNoteData, NoteVisibility } from '@/lib/types'

type NotesTab = 'my-notes' | 'student-notes'

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
  const [activeTab, setActiveTab] = useState<NotesTab>('my-notes')
  const [filterStudent, setFilterStudent] = useState<string>('')
  const [filterVisibility, setFilterVisibility] = useState<NoteVisibility | ''>('')
  const [filterTag, setFilterTag] = useState<string>('')

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
      <PortalLayout profile={profile}>
        <PageSkeleton variant="list" withAction withToolbar />
      </PortalLayout>
    )
  }

  const availableTags = ['technique', 'performance', 'improvement', 'attendance', 'behavior', 'progress', 'injury']
  const displayNotes = activeTab === 'student-notes' ? studentNotes : notes
  const studentNotesCount = studentNotes.length
  const hasActiveFilters = Boolean(filterStudent || filterVisibility || filterTag)

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

  // Helper to get visibility label and StatusDot tone
  const getVisibilityInfo = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return { label: 'Private', tone: 'neutral' as const }
      case 'shared_with_student':
        return { label: 'Shared with Student', tone: 'positive' as const }
      case 'shared_with_guardian':
        return { label: 'Shared with Guardian', tone: 'positive' as const }
      case 'shared_with_studio':
        return { label: 'Shared with Studio', tone: 'neutral' as const }
      case 'shared_with_instructor':
        return { label: 'Shared with You', tone: 'accent' as const }
      default:
        return { label: visibility.replace(/_/g, ' '), tone: 'neutral' as const }
    }
  }

  const getEmptyMessage = () => {
    if (activeTab === 'student-notes') {
      return 'Students have not shared any notes with you yet.'
    }
    if (hasActiveFilters) {
      return 'No notes match these filters.'
    }
    return 'Create your first note to start tracking student progress.'
  }

  const getEmptyAction = () => {
    if (activeTab !== 'my-notes') return undefined
    if (hasActiveFilters) {
      return (
        <Button
          variant="outline"
          onClick={() => {
            setFilterStudent('')
            setFilterVisibility('')
            setFilterTag('')
          }}
        >
          Clear filters
        </Button>
      )
    }
    return (
      <Button onClick={() => setShowAddModal(true)}>
        <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
        Add note
      </Button>
    )
  }

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Notes"
        subtitle="Track student progress and observations"
        action={
          activeTab === 'my-notes' ? (
            <Button onClick={() => setShowAddModal(true)}>
              <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
              Add note
            </Button>
          ) : undefined
        }
      />

      <Toolbar
        search={
          <SegmentedControl<NotesTab>
            aria-label="Switch between your notes and student notes"
            options={[
              { value: 'my-notes', label: 'My notes' },
              { value: 'student-notes', label: `Student notes (${studentNotesCount})` }
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        }
        filters={
          activeTab === 'my-notes' ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="w-full sm:w-44">
                <Select
                  aria-label="Filter notes by student"
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  options={[
                    { value: '', label: 'All Students' },
                    ...students.map(student => ({
                      value: student.id,
                      label: student.profile?.full_name || student.full_name || 'Unknown'
                    }))
                  ]}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  aria-label="Filter notes by visibility"
                  value={filterVisibility}
                  onChange={(e) => setFilterVisibility(e.target.value as NoteVisibility | '')}
                  options={[
                    { value: '', label: 'All Visibility' },
                    { value: 'private', label: 'Private' },
                    { value: 'shared_with_student', label: 'Shared with Student' },
                    { value: 'shared_with_guardian', label: 'Shared with Guardian' }
                  ]}
                />
              </div>
              <div className="w-full sm:w-44">
                <Select
                  aria-label="Filter notes by tag"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  options={[
                    { value: '', label: 'All Tags' },
                    ...availableTags.map(tag => ({ value: tag, label: tag }))
                  ]}
                />
              </div>
            </div>
          ) : undefined
        }
      />

      <div className="mt-toolbar-gap">
        {loading ? (
          <NoteListSkeleton count={4} />
        ) : displayNotes.length === 0 ? (
          <div className="rounded-lg border border-champagne-200 bg-champagne-50">
            <EmptyState
              icon={<DocumentTextIcon />}
              message={getEmptyMessage()}
              action={getEmptyAction()}
            />
          </div>
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
                  className="group rounded-lg border border-champagne-200 bg-champagne-50 p-4 transition-colors hover:bg-champagne-100"
                >
                  {/* Header Row: Avatars + Author/Student info + Time + Actions */}
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
                            <svg className="w-4 h-4 text-charcoal-300 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            <div className="font-medium text-charcoal-950 text-sm">
                              {studentName}
                            </div>
                            <div className="text-sm text-charcoal-400">
                              shared with you • {getRelativeTime(note.created_at)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-medium text-charcoal-950 text-sm">
                              Note for {studentName}
                            </div>
                            <div className="text-sm text-charcoal-400">
                              {getRelativeTime(note.created_at)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Row actions (only for my-notes), revealed on hover */}
                    {activeTab === 'my-notes' && (
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                        <Button size="sm" variant="ghost" onClick={() => handleEditNote(note)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteNote(note.id)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  {note.title && (
                    <h3 className="font-serif text-lg font-semibold text-charcoal-950 mb-2">
                      {note.title}
                    </h3>
                  )}

                  {/* Linked class info */}
                  {(note.class || note.classes) && (
                    <div className="flex items-center gap-1.5 mb-2 text-sm text-charcoal-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {(note.class || note.classes)?.title}
                        {(note.class || note.classes)?.start_time && (
                          <span className="text-charcoal-300 ml-1">
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
                      className="text-charcoal-500 text-sm line-clamp-3"
                    />
                  </div>

                  {/* Footer Row: Visibility + Tags */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Visibility */}
                    <StatusDot tone={visibilityInfo.tone} label={visibilityInfo.label} />

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
      </div>

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
            <label className="block text-sm font-medium text-charcoal-700 mb-1">
              Student
            </label>
            <select
              className="w-full px-4 py-2 border border-champagne-200 bg-champagne-50 text-charcoal-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
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
            <label className="block text-sm font-medium text-charcoal-700 mb-1">
              Related Class
            </label>
            <select
              className="w-full px-4 py-2 border border-champagne-200 bg-champagne-50 text-charcoal-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
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
              <label className="block text-sm font-medium text-charcoal-700">
                Content *
              </label>
              <div className="flex items-center gap-2">
                {previousContent && (
                  <button
                    type="button"
                    onClick={handleUndoFormat}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-charcoal-700 bg-champagne-100 hover:bg-champagne-200 rounded-md transition-colors"
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
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gold-700 bg-gold-50 hover:bg-gold-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
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
                      ? 'bg-rose-600 text-champagne-50'
                      : 'bg-champagne-100 text-charcoal-700 hover:bg-champagne-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">
              Visibility *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-champagne-200 bg-champagne-50 text-charcoal-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.visibility}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value as NoteVisibility })}
            >
              <option value="private">Private (Only me)</option>
              <option value="shared_with_student">Shared with Student</option>
              <option value="shared_with_guardian">Shared with Guardian</option>
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
      <PortalLayout profile={null}>
        <PageSkeleton variant="list" withAction withToolbar />
      </PortalLayout>
    }>
      <NotesContent />
    </Suspense>
  )
}
