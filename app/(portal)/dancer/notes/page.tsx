'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useMemo } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Spinner } from '@/components/ui/Spinner'
import { NoteFeedList } from '@/components/notes/NoteFeedList'
import { NoteFocusMode } from '@/components/notes/NoteFocusMode'
import { NoteSearchBar } from '@/components/notes/NoteSearchBar'
import { FloatingActionButton } from '@/components/notes/FloatingActionButton'
import { Note } from '@/lib/utils/date-helpers'
import { Input } from '@/components/ui/Input'

interface ClassOption {
  id: string
  title: string
  start_time: string
  type: 'enrolled' | 'personal'
}

type TabType = 'all' | 'instructor' | 'personal'

export default function DancerNotesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [focusModeOpen, setFocusModeOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [classId, setClassId] = useState('')
  const [classType, setClassType] = useState<'enrolled' | 'personal' | ''>('')
  const [isPrivate, setIsPrivate] = useState(false)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchNotes()
      fetchClasses()
    }
  }, [loading, user, profile])

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/dancer/notes')
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const fetchClasses = async () => {
    setLoadingClasses(true)
    try {
      const [enrolledResponse, personalResponse] = await Promise.all([
        fetch('/api/dancer/classes'),
        fetch('/api/dancer/personal-classes')
      ])

      const allClasses: ClassOption[] = []

      if (enrolledResponse.ok) {
        const data = await enrolledResponse.json()
        allClasses.push(...data.classes.map((c: any) => ({
          id: c.id,
          title: c.title,
          start_time: c.start_time,
          type: 'enrolled' as const
        })))
      }

      if (personalResponse.ok) {
        const data = await personalResponse.json()
        allClasses.push(...data.classes.map((c: any) => ({
          id: c.id,
          title: c.title,
          start_time: c.start_time,
          type: 'personal' as const
        })))
      }

      // Sort by most recent first
      allClasses.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      setClasses(allClasses)
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoadingClasses(false)
    }
  }

  // Get all unique tags from notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    notes.forEach(note => {
      note.tags?.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [notes])

  // Filter notes based on active tab, search term, and selected tag
  const filteredNotes = useMemo(() => {
    let filtered = notes

    // Tab filter
    if (activeTab === 'instructor') {
      filtered = notes.filter((note) => !note.is_personal && note.is_shared)
    } else if (activeTab === 'personal') {
      filtered = notes.filter((note) => note.is_personal)
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((note) =>
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note as any).author_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter((note) => note.tags?.includes(selectedTag))
    }

    return filtered
  }, [notes, activeTab, searchTerm, selectedTag])

  const instructorNotesCount = notes.filter((n) => !n.is_personal && (n as any).is_shared).length
  const personalNotesCount = notes.filter((n) => n.is_personal).length

  const handleOpenFocusMode = (note?: Note) => {
    if (note) {
      // Only allow editing personal notes
      if (!note.is_personal) {
        return // Can't edit instructor notes
      }
      setEditingNote(note)
      const noteClassId = (note as any).class_id || (note as any).personal_class_id || ''
      const noteClassType = (note as any).class_id ? 'enrolled' : (note as any).personal_class_id ? 'personal' : ''
      setClassId(noteClassId)
      setClassType(noteClassType as 'enrolled' | 'personal' | '')
      setIsPrivate((note as any).visibility === 'private')
    } else {
      setEditingNote(null)
      setClassId('')
      setClassType('')
      setIsPrivate(false)
    }
    setFocusModeOpen(true)
  }

  const handleCloseFocusMode = () => {
    setFocusModeOpen(false)
    setEditingNote(null)
    setClassId('')
    setClassType('')
    setIsPrivate(false)
  }

  const handleSave = async (data: { title: string; content: string; tags: string[] }) => {
    try {
      const payload: any = {
        title: data.title || null,
        content: data.content,
        tags: data.tags,
        visibility: isPrivate ? 'private' : 'shared_with_instructor'
      }

      // Add class reference based on type
      if (classId && classType === 'enrolled') {
        payload.class_id = classId
        payload.personal_class_id = null
      } else if (classId && classType === 'personal') {
        payload.class_id = null
        payload.personal_class_id = classId
      } else {
        payload.class_id = null
        payload.personal_class_id = null
      }

      const endpoint = '/api/dancer/notes'
      const method = editingNote ? 'PUT' : 'POST'

      if (editingNote) {
        payload.id = editingNote.id
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save note')
      }

      await fetchNotes()
      handleCloseFocusMode()
    } catch (error) {
      console.error('Error saving note:', error)
      throw error
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const response = await fetch(`/api/dancer/notes?id=${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete note')
      }

      await fetchNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note')
    }
  }

  const handlePin = async (noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note || !note.is_personal) {
      // Can only pin personal notes
      return
    }

    // Optimistic update
    setNotes(prev => prev.map(n =>
      n.id === noteId
        ? { ...n, is_pinned: !n.is_pinned }
        : n
    ))

    try {
      const response = await fetch('/api/dancer/notes/pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: noteId, is_pinned: !note.is_pinned })
      })

      if (!response.ok) {
        throw new Error('Failed to pin note')
      }

      // Refresh notes to get correct ordering
      await fetchNotes()
    } catch (error) {
      // Rollback optimistic update
      setNotes(prev => prev.map(n =>
        n.id === noteId
          ? { ...n, is_pinned: note.is_pinned }
          : n
      ))
      console.error('Error pinning note:', error)
      alert('Failed to pin note')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Notes
        </h1>
        <p className="text-gray-600">
          Track your progress with instructor feedback and personal reflections
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${activeTab === 'all'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              All Notes ({notes.length})
            </button>
            <button
              onClick={() => setActiveTab('instructor')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${activeTab === 'instructor'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Instructor Feedback ({instructorNotesCount})
            </button>
            <button
              onClick={() => setActiveTab('personal')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                ${activeTab === 'personal'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Personal Notes ({personalNotesCount})
            </button>
          </nav>
        </div>
      </div>

      {loadingNotes ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Search and filter bar */}
          <NoteSearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
            allTags={allTags}
          />

          {/* Notes feed with timeline */}
          <NoteFeedList
            notes={filteredNotes}
            onEdit={handleOpenFocusMode}
            onDelete={handleDelete}
            onPin={handlePin}
          />

          {/* Floating action button */}
          <FloatingActionButton
            onClick={() => handleOpenFocusMode()}
          />

          {/* Focus mode for creating/editing personal notes */}
          <NoteFocusMode
            note={editingNote}
            isOpen={focusModeOpen}
            onClose={handleCloseFocusMode}
            onSave={handleSave}
            classes={classes}
            selectedClassId={classId}
            selectedClassType={classType}
            onClassChange={(id, type) => {
              setClassId(id)
              setClassType(type)
            }}
            isPrivate={isPrivate}
            onVisibilityChange={setIsPrivate}
          />

        </>
      )}
    </PortalLayout>
  )
}
