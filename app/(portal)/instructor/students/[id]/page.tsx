'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { RichTextEditor } from '@/components/RichTextEditor'
import { Card, CardTitle, CardContent, Button, Badge, useToast, Spinner, Input, Textarea, Modal, ModalFooter } from '@/components/ui'
import type { Student, Note, Enrollment, Payment, PrivateLessonRequest, UpdateStudentData } from '@/lib/types'

export default function StudentDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [student, setStudent] = useState<Student | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [requests, setRequests] = useState<PrivateLessonRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linking, setLinking] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [noteFormData, setNoteFormData] = useState({
    title: '',
    content: '',
    tags: '',
    class_id: '',
    visibility: 'shared_with_student'
  })
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user && id) {
      fetchStudentDetails()
    }
  }, [user?.id, id])

  const fetchStudentDetails = async () => {
    try {
      const response = await fetch(`/api/students/${id}`)
      if (!response.ok) throw new Error('Failed to fetch student')
      
      const data = await response.json()
      setStudent(data.student)
      setEnrollments(data.enrollments || [])
      setNotes(data.notes || [])
      setPayments(data.payments || [])
      setRequests(data.private_lesson_requests || [])
    } catch (error) {
      console.error('Error fetching student:', error)
      addToast('Failed to load student details', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStudent = async (formData: UpdateStudentData) => {
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to update student')

      const { student: updatedStudent } = await response.json()
      setStudent(updatedStudent)
      setShowEditModal(false)
      addToast('Student updated successfully', 'success')
    } catch (error) {
      console.error('Error updating student:', error)
      addToast('Failed to update student', 'error')
    }
  }

  const handleOpenNoteModal = (note?: any) => {
    if (note) {
      setEditingNote(note)
      setNoteFormData({
        title: note.title || '',
        content: note.content,
        tags: note.tags?.join(', ') || '',
        class_id: note.class_id || '',
        visibility: note.visibility || 'shared_with_student'
      })
    } else {
      setEditingNote(null)
      setNoteFormData({
        title: '',
        content: '',
        tags: '',
        class_id: '',
        visibility: 'shared_with_student'
      })
    }
    setShowNoteModal(true)
  }

  const handleCloseNoteModal = () => {
    setShowNoteModal(false)
    setEditingNote(null)
    setNoteFormData({
      title: '',
      content: '',
      tags: '',
      class_id: '',
      visibility: 'shared_with_student'
    })
  }

  const handleSaveNote = async () => {
    if (!noteFormData.content.trim()) {
      addToast('Please enter note content', 'error')
      return
    }

    setSavingNote(true)
    try {
      const tags = noteFormData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const payload: any = {
        title: noteFormData.title.trim() || null,
        content: noteFormData.content.trim(),
        tags,
        class_id: noteFormData.class_id || null,
        visibility: noteFormData.visibility
      }

      const url = '/api/instructor/notes'
      const method = editingNote ? 'PUT' : 'POST'

      if (editingNote) {
        payload.id = editingNote.id
      } else {
        payload.student_id = student?.id
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || `Failed to ${editingNote ? 'update' : 'create'} note`)
      }

      await fetchStudentDetails()
      handleCloseNoteModal()
      addToast(`Note ${editingNote ? 'updated' : 'created'} successfully`, 'success')
    } catch (error) {
      console.error('Error saving note:', error)
      const errorMessage = error instanceof Error ? error.message : `Failed to ${editingNote ? 'update' : 'create'} note`
      addToast(errorMessage, 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return
    }

    try {
      const response = await fetch(`/api/instructor/notes?id=${noteId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete note')
      }

      await fetchStudentDetails()
      addToast('Note deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting note:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note'
      addToast(errorMessage, 'error')
    }
  }

  const handleLinkAccount = async () => {
    if (!linkEmail.trim()) {
      addToast('Please enter an email address', 'error')
      return
    }

    setLinking(true)
    try {
      const response = await fetch(`/api/students/${id}/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: linkEmail.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        addToast(data.error || 'Failed to link account', 'error')
        return
      }

      setStudent(data.student)
      setShowLinkModal(false)
      setLinkEmail('')
      addToast(data.message || 'Account linked successfully', 'success')
    } catch (error) {
      console.error('Error linking account:', error)
      addToast('Failed to link account', 'error')
    } finally {
      setLinking(false)
    }
  }

  if (authLoading || loading || !profile || profile.role !== 'instructor' && profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!student) {
    return (
      <PortalLayout profile={profile}>
        <div className="text-center py-12">
          <p className="text-gray-600">Student not found</p>
          <Button onClick={() => router.push('/instructor/students')} className="mt-4">
            Back to Students
          </Button>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/instructor/students')}>
          ← Back to Students
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardTitle>Student Profile</CardTitle>
            <CardContent className="mt-4 space-y-3">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {student.full_name || student.profile?.full_name}
                </h3>
                <div className="flex gap-2 mt-2">
                  <Badge variant={student.is_active ? 'success' : 'default'}>
                    {student.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {!student.profile_id && (
                    <Badge variant="warning">Not Linked</Badge>
                  )}
                </div>
              </div>

              {!student.profile_id && (
                <div className="pt-3 pb-3 border-b border-gray-200">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 mb-2">
                      This student doesn't have a linked dancer account yet.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkModal(true)}
                      className="w-full"
                    >
                      Link to Dancer Account
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900">{student.email || student.profile?.email || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-gray-900">{student.phone || student.profile?.phone || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Age Group</p>
                <p className="text-gray-900">{student.age_group || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Skill Level</p>
                <p className="text-gray-900">{student.skill_level || 'N/A'}</p>
              </div>

              {student.goals && (
                <div>
                  <p className="text-sm text-gray-600">Goals</p>
                  <p className="text-gray-900">{student.goals}</p>
                </div>
              )}

              {student.medical_notes && (
                <div>
                  <p className="text-sm text-gray-600">Medical Notes</p>
                  <p className="text-gray-900">{student.medical_notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Emergency Contact</p>
                <p className="text-gray-900">{student.emergency_contact_name}</p>
                <p className="text-gray-900">{student.emergency_contact_phone}</p>
              </div>

              <Button onClick={() => setShowEditModal(true)} className="w-full mt-4">
                Edit Student Info
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardTitle>Enrolled Classes ({enrollments.length})</CardTitle>
            <CardContent className="mt-4">
              {enrollments.length === 0 ? (
                <p className="text-gray-600">No enrollments yet</p>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{enrollment.class?.title}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(enrollment.class?.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      {enrollment.attendance_status && (
                        <Badge variant="default">{enrollment.attendance_status}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Notes */}
          <Card>
            <div className="flex justify-between items-center">
              <CardTitle>My Notes ({notes.filter((n: any) => n.author_id === profile?.id).length})</CardTitle>
              <div className="flex gap-2">
                <Link href={`/instructor/notes?student_id=${student.id}`}>
                  <Button variant="outline" size="sm">
                    View All Notes
                  </Button>
                </Link>
                <Button variant="primary" size="sm" onClick={() => handleOpenNoteModal()}>
                  + Add Note
                </Button>
              </div>
            </div>
            <CardContent className="mt-4">
              {notes.filter((n: any) => n.author_id === profile?.id).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No notes yet</p>
                  <Button variant="outline" onClick={() => handleOpenNoteModal()}>
                    Create First Note
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.filter((n: any) => n.author_id === profile?.id).map((note: any) => (
                    <div
                      key={note.id}
                      className="border-l-4 border-rose-500 pl-4 py-2 hover:bg-gray-50 rounded-r transition-colors cursor-pointer group relative"
                      onClick={() => handleOpenNoteModal(note)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{note.title || 'Note'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="primary" size="sm">
                              You
                            </Badge>
                            {note.class_name && (
                              <span className="text-xs text-gray-600">{note.class_name}</span>
                            )}
                            <Badge variant="secondary" size="sm">{note.visibility}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500">
                            {new Date(note.created_at).toLocaleDateString()}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteNote(note.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                      <div className="text-gray-700 mb-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: note.content }} />
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="secondary" size="sm">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to edit
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student Notes */}
          <Card>
            <div className="flex justify-between items-center">
              <CardTitle>Student Notes ({notes.filter((n: any) => n.visibility === 'shared_with_instructor').length})</CardTitle>
              <Link href={`/instructor/notes?student_id=${student.id}`}>
                <Button variant="outline" size="sm">
                  View All Notes
                </Button>
              </Link>
            </div>
            <CardContent className="mt-4">
              {notes.filter((n: any) => n.visibility === 'shared_with_instructor').length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No notes shared with you yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.filter((n: any) => n.visibility === 'shared_with_instructor').map((note: any) => (
                    <div
                      key={note.id}
                      className="border-l-4 border-rose-300 pl-4 py-2 hover:bg-gray-50 rounded-r transition-colors group relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{note.title || 'Note'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="default" size="sm">
                              {note.author_name || 'Student'}
                            </Badge>
                            {note.class_name && (
                              <span className="text-xs text-gray-600">{note.class_name}</span>
                            )}
                            <Badge variant="secondary" size="sm">{note.visibility}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-gray-700 mb-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: note.content }} />
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="secondary" size="sm">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="flex justify-between items-center">
              <CardTitle>Private Lesson Requests ({requests.length})</CardTitle>
              <Link href="/instructor/requests">
                <Button variant="outline" size="sm">
                  View All Requests
                </Button>
              </Link>
            </div>
            <CardContent className="mt-4">
              {requests.length === 0 ? (
                <p className="text-gray-600">No requests</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((request: any) => (
                    <Link 
                      key={request.id} 
                      href="/instructor/requests"
                      className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-medium text-gray-900">{request.requested_focus}</p>
                        <Badge variant={request.status === 'pending' ? 'warning' : 'success'}>
                          {request.status}
                        </Badge>
                      </div>
                      {request.additional_notes && (
                        <p className="text-sm text-gray-600">{request.additional_notes}</p>
                      )}
                      <p className="text-xs text-rose-600 mt-2">Click to view details →</p>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardTitle>Payment History ({payments.length})</CardTitle>
            <CardContent className="mt-4">
              {payments.length === 0 ? (
                <p className="text-gray-600">No payment history</p>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">${payment.amount}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.transaction_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={payment.payment_status === 'confirmed' ? 'success' : 'warning'}>
                        {payment.payment_status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showEditModal && student && (
        <EditStudentModal
          student={student}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateStudent}
        />
      )}

      {showLinkModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowLinkModal(false)
            setLinkEmail('')
          }}
          title="Link Student to Dancer Account"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the email address the dancer used to create their account. This will link this student record to their dancer portal access.
            </p>
            <Input
              label="Dancer Email Address"
              type="email"
              required
              placeholder="dancer@example.com"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
              helperText="The dancer must have already signed up with this email"
            />
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowLinkModal(false)
                setLinkEmail('')
              }}
              disabled={linking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkAccount}
              disabled={linking || !linkEmail.trim()}
            >
              {linking ? 'Linking...' : 'Link Account'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {showNoteModal && (
        <Modal
          isOpen={true}
          onClose={handleCloseNoteModal}
          title={editingNote ? 'Edit Note' : 'Add Note for Student'}
          size="lg"
        >
          <div className="space-y-4">
            <Input
              label="Title (optional)"
              placeholder="Note title..."
              value={noteFormData.title}
              onChange={(e) => setNoteFormData({ ...noteFormData, title: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <RichTextEditor
                content={noteFormData.content}
                onChange={(html) => setNoteFormData({ ...noteFormData, content: html })}
                placeholder="Share your feedback, observations, or progress notes..."
              />
            </div>
            <Input
              label="Tags (optional)"
              placeholder="technique, improvement, strength (comma-separated)"
              value={noteFormData.tags}
              onChange={(e) => setNoteFormData({ ...noteFormData, tags: e.target.value })}
              helperText="Add tags to categorize this note"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Class (optional)
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                value={noteFormData.class_id}
                onChange={(e) => setNoteFormData({ ...noteFormData, class_id: e.target.value })}
              >
                <option value="">-- General Note (No Specific Class) --</option>
                {enrollments.map((enrollment: any) => (
                  <option key={enrollment.class_id} value={enrollment.class_id}>
                    {enrollment.class?.title} - {new Date(enrollment.class?.start_time).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Link this note to a specific class the student is enrolled in
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                value={noteFormData.visibility}
                onChange={(e) => setNoteFormData({ ...noteFormData, visibility: e.target.value })}
              >
                <option value="shared_with_student">Share with Student</option>
                <option value="shared_with_guardian">Share with Guardian</option>
                <option value="private">Private (Instructor Only)</option>
              </select>
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={handleCloseNoteModal}
              disabled={savingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={savingNote}
            >
              {savingNote ? 'Saving...' : editingNote ? 'Update Note' : 'Save Note'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </PortalLayout>
  )
}

interface EditStudentModalProps {
  student: Student
  onClose: () => void
  onSubmit: (data: UpdateStudentData) => void
}

function EditStudentModal({ student, onClose, onSubmit }: EditStudentModalProps) {
  const [formData, setFormData] = useState<UpdateStudentData>({
    full_name: student.full_name || student.profile?.full_name || '',
    email: student.email || student.profile?.email || '',
    phone: student.phone || student.profile?.phone || '',
    age_group: student.age_group || '',
    skill_level: student.skill_level || '',
    goals: student.goals || '',
    medical_notes: student.medical_notes || '',
    emergency_contact_name: student.emergency_contact_name || '',
    emergency_contact_phone: student.emergency_contact_phone || '',
    is_active: student.is_active
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Student" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age Group
              </label>
              <select
                value={formData.age_group}
                onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
              >
                <option value="">Select age group...</option>
                <option value="Child (<13)">Child (&lt;13)</option>
                <option value="Teen (13-18)">Teen (13-18)</option>
                <option value="Adult (+18)">Adult (+18)</option>
              </select>
            </div>
            <Input
              label="Skill Level"
              value={formData.skill_level}
              onChange={(e) => setFormData({ ...formData, skill_level: e.target.value })}
            />
          </div>

          <Textarea
            label="Goals"
            rows={3}
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          />

          <Textarea
            label="Medical Notes"
            rows={2}
            value={formData.medical_notes}
            onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Name"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
            />
            <Input
              label="Emergency Contact Phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Active Student
            </label>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
