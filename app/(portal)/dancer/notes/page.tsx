'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { NotesRichTextEditor, RichTextDisplay, Editor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { PlusIcon } from '@heroicons/react/24/outline'

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
  personal_class_id: string | null
  classes: {
    id: string
    title: string
    start_time: string
  } | null
  personal_classes: {
    id: string
    title: string
    start_time: string
  } | null
  author_name: string
  author_role: string
  is_personal: boolean
  is_shared: boolean
}

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: '',
    class_id: '',
    class_type: '' as 'enrolled' | 'personal' | '',
    is_private: false
  })
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
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

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note)
      const classId = note.class_id || note.personal_class_id || ''
      const classType = note.class_id ? 'enrolled' : note.personal_class_id ? 'personal' : ''
      setFormData({
        title: note.title || '',
        content: note.content,
        tags: note.tags?.join(', ') || '',
        class_id: classId,
        class_type: classType as 'enrolled' | 'personal' | '',
        is_private: note.visibility === 'private'
      })
    } else {
      setEditingNote(null)
      setFormData({ title: '', content: '', tags: '', class_id: '', class_type: '', is_private: false })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingNote(null)
    setFormData({ title: '', content: '', tags: '', class_id: '', class_type: '', is_private: false })
    setEditor(null)
  }

  const handleVoiceTranscript = (html: string) => {
    if (editor) {
      // Insert at cursor position
      editor.chain().focus().insertContent(html).run()
      // Update form data with new content
      setFormData(prev => ({ ...prev, content: editor.getHTML() }))
    } else {
      // Fallback: append to existing content
      setFormData(prev => ({
        ...prev,
        content: prev.content && prev.content !== '<p></p>'
          ? `${prev.content}${html}`
          : html
      }))
    }
  }

  const handleSave = async () => {
    if (!formData.content.trim()) {
      alert('Please enter some content for your note')
      return
    }

    setSaving(true)
    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const payload: any = {
        title: formData.title.trim() || null,
        content: formData.content.trim(),
        tags,
        visibility: formData.is_private ? 'private' : 'shared_with_instructor'
      }

      // Add class reference based on type
      if (formData.class_id && formData.class_type === 'enrolled') {
        payload.class_id = formData.class_id
        payload.personal_class_id = null
      } else if (formData.class_id && formData.class_type === 'personal') {
        payload.class_id = null
        payload.personal_class_id = formData.class_id
      } else {
        payload.class_id = null
        payload.personal_class_id = null
      }

      const url = '/api/dancer/notes'
      const method = editingNote ? 'PUT' : 'POST'
      const body = editingNote
        ? { ...payload, id: editingNote.id }
        : payload

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await fetchNotes()
        handleCloseModal()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save note')
      }
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note')
    } finally {
      setSaving(false)
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

      if (response.ok) {
        await fetchNotes()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete note')
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note')
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

  // Filter notes based on active tab
  const getFilteredNotes = () => {
    let filtered = notes

    if (activeTab === 'instructor') {
      filtered = notes.filter((note) => !note.is_personal && note.is_shared)
    } else if (activeTab === 'personal') {
      filtered = notes.filter((note) => note.is_personal)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((note) =>
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.author_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply tag filter
    if (selectedTag) {
      filtered = filtered.filter((note) => note.tags?.includes(selectedTag))
    }

    return filtered
  }

  const filteredNotes = getFilteredNotes()
  const allTags = Array.from(
    new Set(notes.flatMap((note) => note.tags || []))
  ).sort()

  const instructorNotesCount = notes.filter((n) => !n.is_personal && n.is_shared).length
  const personalNotesCount = notes.filter((n) => n.is_personal).length

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notes 📝</h1>
          <p className="text-gray-600">
            Track your progress with instructor feedback and personal reflections
          </p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()} className="p-2 rounded-full aspect-square flex items-center justify-center">
          <PlusIcon className="h-6 w-6" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
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
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
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
                py-4 px-1 border-b-2 font-medium text-sm transition-colors
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

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-700 self-center">Filter by tag:</span>
            <button onClick={() => setSelectedTag(null)}>
              <Badge
                variant={!selectedTag ? 'primary' : 'default'}
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                All
              </Badge>
            </button>
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

      {/* Notes List */}
      {loadingNotes ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} hover>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={note.is_personal ? 'default' : 'primary'}
                        size="sm"
                      >
                        {note.is_personal ? '✍️ Self' : '📝 ' + note.author_name}
                      </Badge>
                      {(note.classes || note.personal_classes) && (
                        <Badge variant="secondary" size="sm">
                          {note.classes?.title || note.personal_classes?.title}
                        </Badge>
                      )}
                    </div>
                    {note.title && (
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {note.title}
                      </h3>
                    )}
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>

                <div className="mb-4">
                  <RichTextDisplay content={note.content} className="text-gray-700" />
                </div>

                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {note.tags.map((tag, idx) => (
                      <Badge key={idx} variant={getTagColor(tag)} size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {note.is_personal && (
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenModal(note)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(note.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">
              {activeTab === 'personal' ? '✍️' : activeTab === 'instructor' ? '🌟' : '📝'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchTerm || selectedTag
                ? 'No matching notes found'
                : activeTab === 'personal'
                ? 'Start Your Personal Journal'
                : activeTab === 'instructor'
                ? 'Your Journey Starts Here!'
                : 'No notes yet'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || selectedTag
                ? 'Try adjusting your search or filter to see more results.'
                : activeTab === 'personal'
                ? 'Create your first note to track your goals, reflections, and progress.'
                : activeTab === 'instructor'
                ? "Your instructor will share feedback and notes about your progress here."
                : 'Add personal notes or receive instructor feedback to start tracking your journey.'}
            </p>
            {searchTerm || selectedTag ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedTag(null)
                }}
              >
                Clear Filters
              </Button>
            ) : activeTab === 'personal' ? (
              <Button variant="primary" onClick={() => handleOpenModal()}>
                Create Your First Note
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingNote ? 'Edit Personal Note' : 'Create Personal Note'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title (optional)"
            placeholder="Give your note a title..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <NotesRichTextEditor
              content={formData.content}
              onChange={(html) => setFormData({ ...formData, content: html })}
              onEditorReady={setEditor}
              placeholder="Write your thoughts, goals, or reflections..."
              minHeight="200px"
            />
            <div className="mt-3">
              <VoiceRecorder
                onTranscriptReady={handleVoiceTranscript}
                disabled={saving}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Link to Class (optional)
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              value={formData.class_id ? `${formData.class_type}:${formData.class_id}` : ''}
              onChange={(e) => {
                if (!e.target.value) {
                  setFormData({ ...formData, class_id: '', class_type: '' })
                } else {
                  const [type, id] = e.target.value.split(':')
                  setFormData({
                    ...formData,
                    class_id: id,
                    class_type: type as 'enrolled' | 'personal'
                  })
                }
              }}
            >
              <option value="">No class selected</option>
              {classes.map((cls) => (
                <option key={`${cls.type}:${cls.id}`} value={`${cls.type}:${cls.id}`}>
                  {cls.title} - {new Date(cls.start_time).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })} {cls.type === 'personal' ? '(Personal)' : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Associate this note with a specific class
            </p>
          </div>
          <Input
            label="Tags (optional)"
            placeholder="technique, goals, choreography (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            helperText="Add tags to organize your notes"
          />
          <div className="border-t border-rose-200 pt-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_private"
                checked={formData.is_private}
                onChange={(e) => setFormData({ ...formData, is_private: e.target.checked })}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <label htmlFor="is_private" className="text-sm font-medium text-gray-700">
                Keep this note private
              </label>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {formData.is_private
                ? 'Only you will see this note'
                : 'Your instructor can see this note'}
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editingNote ? 'Update Note' : 'Create Note'}
          </Button>
        </ModalFooter>
      </Modal>
    </PortalLayout>
  )
}
