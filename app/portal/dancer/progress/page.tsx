'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

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

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
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

                <Card hover className="ml-4">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        {note.title && (
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {note.title}
                          </h3>
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
                      <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
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
                : "Your instructor will share feedback and notes about your progress here. Keep dancing, keep growing, and you&apos;ll see your journey unfold!"}
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
    </PortalLayout>
  )
}
