'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { NotesRichTextEditor, RichTextDisplay, Editor } from '@/components/NotesRichTextEditor'
import { VoiceRecorder } from '@/components/VoiceRecorder'

interface Note {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  created_at: string
  updated_at: string
  is_personal: boolean
}

export default function DancerMyNotesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  })
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState<Editor | null>(null)

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
        setNotes(data.notes.filter((note: Note) => note.is_personal))
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const handleOpenModal = (note?: Note) => {
    if (note) {
      setEditingNote(note)
      setFormData({
        title: note.title || '',
        content: note.content,
        tags: note.tags?.join(', ') || ''
      })
    } else {
      setEditingNote(null)
      setFormData({ title: '', content: '', tags: '' })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingNote(null)
    setFormData({ title: '', content: '', tags: '' })
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
    if (!formData.content.trim() || formData.content === '<p></p>') {
      alert('Please enter some content for your note')
      return
    }

    setSaving(true)
    try {
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const payload = {
        title: formData.title.trim() || null,
        content: formData.content,
        tags
      }

      const url = editingNote
        ? '/api/dancer/notes'
        : '/api/dancer/notes'
      
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

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Notes</h1>
          <p className="text-gray-600">
            Keep track of your thoughts, goals, and reflections on your dance journey
          </p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          Add Note
        </Button>
      </div>

      {loadingNotes ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <Card key={note.id} hover>
              <CardContent className="p-6">
                {note.title && (
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {note.title}
                  </h3>
                )}
                <p className="text-sm text-gray-500 mb-3">
                  {new Date(note.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
                <div className="mb-4 line-clamp-6">
                  <RichTextDisplay content={note.content} className="text-gray-700" />
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {note.tags.map((tag, idx) => (
                      <Badge key={idx} variant="default" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenModal(note)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(note.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">✍️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Start Your Personal Journal
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Create your first note to track your goals, reflections, and progress.
              These notes are private and only visible to you.
            </p>
            <Button variant="primary" onClick={() => handleOpenModal()}>
              Create Your First Note
            </Button>
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingNote ? 'Edit Note' : 'Create New Note'}
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
          <Input
            label="Tags (optional)"
            placeholder="technique, goals, choreography (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            helperText="Add tags to organize your notes"
          />
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
