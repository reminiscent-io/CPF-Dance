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

export default function DancerMyNotesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [focusModeOpen, setFocusModeOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
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
    }
  }, [loading, user, profile])

  const fetchNotes = async () => {
    try {
      const response = await fetch('/api/dancer/notes')
      if (response.ok) {
        const data = await response.json()
        // Filter to only show personal notes (authored by the dancer)
        const personalNotes = data.notes.filter((note: Note) => note.is_personal)
        setNotes(personalNotes)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
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

  // Filter notes based on search term and selected tag
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Search filter
      const matchesSearch = !searchTerm ||
        note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      // Tag filter
      const matchesTag = !selectedTag || note.tags?.includes(selectedTag)

      return matchesSearch && matchesTag
    })
  }, [notes, searchTerm, selectedTag])

  const handleOpenFocusMode = (note?: Note) => {
    setEditingNote(note || null)
    setFocusModeOpen(true)
  }

  const handleCloseFocusMode = () => {
    setFocusModeOpen(false)
    setEditingNote(null)
  }

  const handleSave = async (data: { title: string; content: string; tags: string[] }) => {
    try {
      const endpoint = '/api/dancer/notes'
      const method = editingNote ? 'PUT' : 'POST'

      const body: any = {
        title: data.title || null,
        content: data.content,
        tags: data.tags,
        visibility: 'shared_with_instructor'
      }

      if (editingNote) {
        body.id = editingNote.id
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
    if (!note) return

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
          My Notes 📝
        </h1>
        <p className="text-gray-600">
          Your personal dance journal
        </p>
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

          {/* Focus mode for editing */}
          <NoteFocusMode
            note={editingNote}
            isOpen={focusModeOpen}
            onClose={handleCloseFocusMode}
            onSave={handleSave}
          />
        </>
      )}
    </PortalLayout>
  )
}
