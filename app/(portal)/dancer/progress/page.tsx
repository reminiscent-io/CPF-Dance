'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

interface Note {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  visibility: string
  created_at: string
  updated_at: string
  author_id: string
  class_id: string | null
  classes: {
    id: string
    title: string
    start_time: string
  } | null
  author_name: string
  is_personal: boolean
  is_shared: boolean
}

export default function DancerProgressPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
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
        setNotes(data.notes.filter((note: Note) => note.is_shared))
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
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

  const allTags = Array.from(
    new Set(notes.flatMap((note) => note.tags || []))
  ).sort()

  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchTerm ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.author_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesTag = !selectedTag || note.tags?.includes(selectedTag)

    return matchesSearch && matchesTag
  })

  const getTagColor = (tag: string) => {
    const colors: Record<string, any> = {
      technique: 'primary',
      performance: 'secondary',
      improvement: 'success',
      strength: 'warning',
      flexibility: 'default',
      musicality: 'primary',
      choreography: 'secondary'
    }
    return colors[tag.toLowerCase()] || 'default'
  }

  const handleNoteClick = (note: Note) => {
    setSelectedNote(note)
    setShowNoteModal(true)
  }

  const handleCloseModal = () => {
    setShowNoteModal(false)
    setSelectedNote(null)
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Progress Journey ✨</h1>
        <p className="text-gray-600">
          Track your growth and celebrate your achievements through instructor feedback
        </p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant={selectedTag ? 'primary' : 'outline'}
            onClick={() => setSelectedTag(null)}
          >
            All Notes
          </Button>
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center">Filter by tag:</span>
            {allTags.map((tag) => (
              <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}>
                <Badge
                  variant={selectedTag === tag ? 'primary' : 'default'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {tag}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingNotes ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-rose-300 via-purple-300 to-mauve-300"></div>

          <div className="space-y-8">
            {filteredNotes.map((note, index) => (
              <div key={note.id} className="relative pl-16">
                <div className="absolute left-5 top-6 w-6 h-6 bg-rose-500 rounded-full border-4 border-white shadow-md flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>

                <Card hover className="ml-4 cursor-pointer" onClick={() => handleNoteClick(note)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {note.title && (
                          <div className="flex items-center gap-2 mb-1">
                            <svg
                              className="w-5 h-5 flex-shrink-0 text-purple-500"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-label="Instructor feedback"
                            >
                              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                            </svg>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {note.title}
                            </h3>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span>📝 {note.author_name}</span>
                          {note.classes && (
                            <>
                              <span>•</span>
                              <span>{note.classes.title}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                        {new Date(note.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    <div className="prose prose-sm max-w-none mb-4">
                      <div
                        className="text-gray-700"
                        dangerouslySetInnerHTML={createSanitizedHtml(note.content)}
                      />
                    </div>

                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {note.tags.map((tag, idx) => (
                          <Badge key={idx} variant={getTagColor(tag)} size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || selectedTag
                ? 'No matching notes found'
                : 'Your Journey Starts Here!'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || selectedTag
                ? 'Try adjusting your search or filter to see more results.'
                : "Your instructor will share feedback and notes about your progress here. Keep dancing, keep growing, and you'll see your journey unfold!"}
            </p>
            {(searchTerm || selectedTag) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedTag(null)
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Note Detail Modal */}
      <Modal
        isOpen={showNoteModal}
        onClose={handleCloseModal}
        title="Instructor Feedback"
      >
        {selectedNote && (
          <div className="space-y-4">
            {selectedNote.title && (
              <h3 className="text-2xl font-bold text-gray-900">
                {selectedNote.title}
              </h3>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>📝 {selectedNote.author_name}</span>
              {selectedNote.classes && (
                <>
                  <span>•</span>
                  <span>{selectedNote.classes.title}</span>
                  <span>•</span>
                  <span>
                    {new Date(selectedNote.classes.start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="prose prose-sm max-w-none">
                <div
                  className="text-gray-700"
                  dangerouslySetInnerHTML={createSanitizedHtml(selectedNote.content)}
                />
              </div>
            </div>

            {selectedNote.tags && selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                {selectedNote.tags.map((tag, idx) => (
                  <Badge key={idx} variant={getTagColor(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 text-sm text-gray-500">
              <span>
                Created: {new Date(selectedNote.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  )
}
