'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface StudentData {
  id: string
  age_group: string | null
  skill_level: string | null
  is_active: boolean
  profile: {
    full_name: string
    email: string | null
    phone: string | null
  }
  total_classes: number
}

interface NoteData {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  visibility: string
  created_at: string
  author_id: string
  student: {
    id: string
    profile: {
      full_name: string
    }
  }
  author: {
    full_name: string
  }
  class: {
    title: string
    start_time: string
  } | null
}

export default function StudioStudentsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [students, setStudents] = useState<StudentData[]>([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(true)
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null)
  const [studentNotes, setStudentNotes] = useState<NoteData[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteData | null>(null)
  const [editFormData, setEditFormData] = useState({
    title: '',
    content: '',
    visibility: 'shared_with_student' as string
  })

  useEffect(() => {
    if (!loading && profile && profile.role !== 'studio' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchStudents()
    }
  }, [loading, user, profile, filterActive])

  const fetchStudents = async () => {
    setLoadingStudents(true)
    try {
      const params = new URLSearchParams()
      if (filterActive !== null) {
        params.append('is_active', filterActive.toString())
      }
      const response = await fetch(`/api/studio/students?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students)
      }
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const fetchStudentNotes = async (studentId: string) => {
    setLoadingNotes(true)
    try {
      console.log('Fetching notes for student:', studentId)
      console.log('Current profile:', profile)
      const response = await fetch(`/api/studio/notes?student_id=${studentId}`)
      console.log('Response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Notes data received:', data)
        console.log('Number of notes:', data.notes?.length || 0)
        setStudentNotes(data.notes)
      } else {
        const error = await response.json()
        console.error('Error response:', error)
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const handleViewNotes = (student: StudentData) => {
    setSelectedStudent(student)
    fetchStudentNotes(student.id)
  }

  const handleCloseModal = () => {
    setSelectedStudent(null)
    setStudentNotes([])
    setEditingNote(null)
  }

  const handleEditClick = (note: NoteData) => {
    setEditingNote(note)
    setEditFormData({
      title: note.title || '',
      content: note.content,
      visibility: note.visibility
    })
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
    setEditFormData({ title: '', content: '', visibility: 'shared_with_student' })
  }

  const handleSaveEdit = async () => {
    if (!editingNote || !selectedStudent) return

    try {
      const response = await fetch('/api/studio/notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingNote.id,
          title: editFormData.title,
          content: editFormData.content,
          tags: editingNote.tags,
          visibility: editFormData.visibility
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update note')
      }

      // Refresh notes
      await fetchStudentNotes(selectedStudent.id)
      handleCancelEdit()
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Failed to update note')
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedStudent || !confirm('Are you sure you want to delete this note?')) return

    try {
      const response = await fetch(`/api/studio/notes?id=${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      // Refresh notes
      await fetchStudentNotes(selectedStudent.id)
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

  if (!user || !profile || profile.role !== 'studio' && profile.role !== 'admin') {
    return null
  }

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true
    if (!student.profile) return false
    const query = searchQuery.toLowerCase()
    return (
      student.profile.full_name?.toLowerCase().includes(query) ||
      student.profile.email?.toLowerCase().includes(query) ||
      student.profile.phone?.includes(query)
    )
  })

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Students</h1>
        <p className="text-gray-600">View students enrolled at your studio</p>
      </div>

      <div className="mb-6 space-y-4">
        <Input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterActive === true ? 'primary' : 'outline'}
            onClick={() => setFilterActive(true)}
          >
            Active
          </Button>
          <Button
            variant={filterActive === false ? 'primary' : 'outline'}
            onClick={() => setFilterActive(false)}
          >
            Inactive
          </Button>
          <Button
            variant={filterActive === null ? 'primary' : 'outline'}
            onClick={() => setFilterActive(null)}
          >
            All
          </Button>
        </div>
      </div>

      {loadingStudents ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} hover>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {student.profile?.full_name || 'Unknown Student'}
                    </h3>
                  </div>
                  <Badge variant={student.is_active ? 'success' : 'secondary'} size="sm">
                    {student.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {student.profile?.email && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">✉️</span>
                      <span className="truncate">{student.profile.email}</span>
                    </div>
                  )}
                  {student.profile?.phone && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📞</span>
                      <span>{student.profile.phone}</span>
                    </div>
                  )}
                  {student.skill_level && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">⭐</span>
                      <span className="capitalize">{student.skill_level}</span>
                    </div>
                  )}
                  {student.age_group && (
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">👶</span>
                      <span>{student.age_group}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-700">
                    <span className="mr-2">📚</span>
                    <span>{student.total_classes} classes enrolled</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewNotes(student)}
                    className="w-full"
                  >
                    View Notes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery
                ? 'No Students Found'
                : filterActive === false
                ? 'No Inactive Students'
                : filterActive === true
                ? 'No Active Students'
                : 'No Students Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'There are no students enrolled at your studio yet.'}
            </p>
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        isOpen={selectedStudent !== null}
        onClose={handleCloseModal}
        title={`Notes for ${selectedStudent?.profile?.full_name || 'Student'}`}
        size="lg"
      >
        {loadingNotes ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : studentNotes.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {studentNotes.map((note) => (
              <Card key={note.id}>
                <CardContent className="p-4">
                  {editingNote?.id === note.id ? (
                    // Edit mode
                    <div className="space-y-3">
                      <Input
                        type="text"
                        placeholder="Note title (optional)"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                      />
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        rows={4}
                        placeholder="Note content"
                        value={editFormData.content}
                        onChange={(e) => setEditFormData({ ...editFormData, content: e.target.value })}
                      />
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                        value={editFormData.visibility}
                        onChange={(e) => setEditFormData({ ...editFormData, visibility: e.target.value })}
                      >
                        <option value="private">Private</option>
                        <option value="shared_with_student">Shared with Student</option>
                        <option value="shared_with_guardian">Shared with Guardian</option>
                        <option value="shared_with_studio">Shared with Studio</option>
                      </select>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveEdit} variant="primary" size="sm">
                          Save
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {note.title || 'Untitled Note'}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" size="sm">
                            {note.visibility.replace(/_/g, ' ')}
                          </Badge>
                          {profile && note.author_id === profile.id && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditClick(note)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <span className="text-gray-300">|</span>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-sm text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-700 mb-2">{note.content}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>By {note.author.full_name}</span>
                        <span>•</span>
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        {note.class && (
                          <>
                            <span>•</span>
                            <span>{note.class.title}</span>
                          </>
                        )}
                      </div>
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {note.tags.map((tag) => (
                            <Badge key={tag} variant="default" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-600">
            <p>No notes found for this student.</p>
            {profile?.role === 'studio' && (
              <p className="text-sm mt-2">Notes must have "Shared with Studio" visibility to appear here.</p>
            )}
            {profile?.role === 'admin' && (
              <p className="text-sm mt-2">All notes for this student will appear here.</p>
            )}
          </div>
        )}
      </Modal>
    </PortalLayout>
  )
}
