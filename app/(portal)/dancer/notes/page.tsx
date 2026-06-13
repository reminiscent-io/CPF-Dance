'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, useMemo, Suspense } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Spinner } from '@/components/ui/Spinner'
import { NoteListSkeleton } from '@/components/ui/Skeleton'
import { NoteFeedList } from '@/components/notes/NoteFeedList'
import { NoteFocusMode } from '@/components/notes/NoteFocusMode'
import { NoteSearchBar } from '@/components/notes/NoteSearchBar'
import { PlusIcon } from '@heroicons/react/24/outline'
import { Note } from '@/lib/utils/date-helpers'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { NoteViewContent } from '@/components/notes/NoteViewContent'

interface ClassOption {
  id: string
  title: string
  start_time: string
  type: 'enrolled' | 'personal'
}

type TabType = 'all' | 'instructor' | 'personal'

function DancerNotesContent() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [focusModeOpen, setFocusModeOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [viewingNote, setViewingNote] = useState<Note | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
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

  // Check for create query parameter to auto-open focus mode
  useEffect(() => {
    if (!searchParams) return

    const shouldCreate = searchParams.get('create')
    if (shouldCreate === 'true' && !focusModeOpen) {
      setFocusModeOpen(true)
      // Clear the query parameter after opening
      router.replace('/dancer/notes', { scroll: false })
    }
  }, [searchParams, focusModeOpen, router])

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
      // If it's an instructor note, open in view-only modal
      if (!note.is_personal) {
        setViewingNote(note)
        setShowViewModal(true)
        return
      }
      // For personal notes, open in edit mode
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

  const handleCloseViewModal = () => {
    setShowViewModal(false)
    setViewingNote(null)
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

  // Get current user's full name for avatar display
  const currentUserName = profile?.full_name || user?.email || 'User'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4 italic">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const tabOptions: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'instructor', label: 'Instructor' },
    { id: 'personal', label: 'Personal' }
  ]

  return (
    <PortalLayout profile={profile}>
      <div className="max-w-3xl">
        <PageHeader
          title="Notes"
          subtitle="Feedback from Courtney, alongside what you keep for yourself between lessons."
          action={
            <Button onClick={() => handleOpenFocusMode()} aria-label="Write a new note">
              <PlusIcon className="w-5 h-5 sm:mr-1.5" aria-hidden="true" />
              <span className="hidden sm:inline">Write</span>
            </Button>
          }
        />

        <nav
          aria-label="Filter notes by source"
          className="mt-header-gap flex items-center gap-x-6 text-sm border-b border-champagne-200 pb-3 mb-8"
        >
          {tabOptions.map((tab) => {
            const active = activeTab === tab.id
            const count =
              tab.id === 'all'
                ? notes.length
                : tab.id === 'instructor'
                ? instructorNotesCount
                : personalNotesCount
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={active}
                className={`flex items-baseline gap-2 pb-1 -mb-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ballet-pink-500 focus-visible:ring-offset-4 focus-visible:ring-offset-champagne-50 rounded-sm ${
                  active
                    ? 'text-ballet-pink-700'
                    : 'text-charcoal-500 hover:text-charcoal-900'
                }`}
              >
                <span
                  className={`uppercase tracking-[0.14em] text-xs ${
                    active ? 'font-medium' : ''
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`text-[0.7rem] tabular-nums ${
                    active ? 'text-ballet-pink-600' : 'text-charcoal-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>

      {loadingNotes ? (
        <div className="py-6">
          <NoteListSkeleton count={3} />
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
            currentUserName={currentUserName}
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
      </div>

      <Modal
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
        title={viewingNote?.is_personal ? 'Your note' : 'From Courtney'}
      >
        {viewingNote && (
          <NoteViewContent
            note={viewingNote}
            currentUserName={currentUserName}
            footerSlot={<Button onClick={handleCloseViewModal}>Close</Button>}
          />
        )}
      </Modal>
    </PortalLayout>
  )
}

export default function DancerNotesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <Spinner size="lg" />
      </div>
    }>
      <DancerNotesContent />
    </Suspense>
  )
}
