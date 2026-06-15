'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { RichTextEditor } from '@/components/RichTextEditor'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import { Card, Button, Badge, useToast, Spinner, PageSkeleton, Input, Textarea, Select, Modal, ModalFooter } from '@/components/ui'
import type { Student, Note, Enrollment, Payment, PrivateLessonRequest, UpdateStudentData } from '@/lib/types'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

const VISIBILITY_LABELS: Record<string, string> = {
  private: 'Private',
  shared_with_student: 'Shared with dancer',
  shared_with_guardian: 'Shared with guardian',
  shared_with_instructor: 'From dancer'
}

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
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [linkedStudents, setLinkedStudents] = useState<Array<{ id: string; profile: { full_name: string; email: string } }>>([])
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [merging, setMerging] = useState(false)
  const [loadingLinkedStudents, setLoadingLinkedStudents] = useState(false)
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

  const handleOpenMergeModal = async () => {
    setLoadingLinkedStudents(true)
    setShowMergeModal(true)
    try {
      const response = await fetch(`/api/students/linked?exclude=${id}`)
      if (!response.ok) throw new Error('Failed to fetch linked students')
      const data = await response.json()
      setLinkedStudents(data.students || [])
    } catch (error) {
      console.error('Error fetching linked students:', error)
      addToast('Failed to load dancer accounts', 'error')
    } finally {
      setLoadingLinkedStudents(false)
    }
  }

  const handleCloseMergeModal = () => {
    setShowMergeModal(false)
    setSelectedTargetId('')
    setLinkedStudents([])
  }

  const handleMerge = async () => {
    if (!selectedTargetId) {
      addToast('Please select a dancer account to merge into', 'error')
      return
    }

    if (!confirm('Are you sure you want to merge this student? This action cannot be undone. All notes, enrollments, payments, and other data will be transferred to the selected dancer account, and this student record will be deleted.')) {
      return
    }

    setMerging(true)
    try {
      const response = await fetch(`/api/students/${id}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_student_id: selectedTargetId })
      })

      const data = await response.json()

      if (!response.ok) {
        addToast(data.error || 'Failed to merge students', 'error')
        return
      }

      addToast(data.message || 'Students merged successfully', 'success')
      handleCloseMergeModal()
      // Redirect to the merged student's page
      router.push(`/instructor/students/${selectedTargetId}`)
    } catch (error) {
      console.error('Error merging students:', error)
      addToast('Failed to merge students', 'error')
    } finally {
      setMerging(false)
    }
  }

  if (authLoading || loading || !profile || profile.role !== 'instructor' && profile.role !== 'admin') {
    return (
      <PortalLayout profile={profile}>
        <PageSkeleton variant="detail" withAction />
      </PortalLayout>
    )
  }

  if (!student) {
    return (
      <PortalLayout profile={profile}>
        <div className="text-center py-12">
          <p className="text-charcoal-500">Student not found</p>
          <Button onClick={() => router.push('/instructor/students')} className="mt-4">
            Back to Students
          </Button>
        </div>
      </PortalLayout>
    )
  }

  const studentName = student.full_name || student.profile?.full_name
  const instructorNotes = notes.filter((n: any) => n.visibility !== 'shared_with_instructor')
  const dancerNotes = notes.filter((n: any) => n.visibility === 'shared_with_instructor')
  const trainingMeta = [student.age_group, student.skill_level].filter(Boolean).join(' · ')

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-8">
        <div>
          <Link
            href="/instructor/students"
            className="text-sm text-charcoal-500 hover:text-rose-700 transition-colors"
          >
            ← Students
          </Link>
          <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-serif text-4xl font-semibold text-charcoal-950 tracking-[-0.02em]">
                  {studentName}
                </h1>
                <Badge variant={student.is_active ? 'primary' : 'default'} size="sm">
                  {student.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {!student.profile_id && (
                  <Badge variant="warning" size="sm">Not linked</Badge>
                )}
              </div>
              {trainingMeta && <p className="text-charcoal-500 mt-1">{trainingMeta}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
                Edit profile
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleOpenNoteModal()}>
                <PencilSquareIcon className="w-4 h-4 mr-1.5" aria-hidden="true" />
                Add note
              </Button>
            </div>
          </header>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <aside className="lg:sticky lg:top-6">
            <Card padding="none">
              {!student.profile_id && (
                <div className="px-6 py-5 bg-champagne-100 rounded-t-lg border-b border-champagne-200">
                  <p className="text-sm text-charcoal-700">
                    No dancer account linked. Link or merge to give this student portal access.
                  </p>
                  <div className="mt-3 space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkModal(true)}
                      className="w-full"
                    >
                      Link to dancer account
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleOpenMergeModal}
                      className="w-full"
                    >
                      Merge into existing dancer
                    </Button>
                  </div>
                </div>
              )}

              <dl className="px-6 py-5">
                <FactGroup label="Contact">
                  <Fact label="Email" value={student.email || student.profile?.email} />
                  <Fact label="Phone" value={student.phone || student.profile?.phone} />
                </FactGroup>

                <FactGroup label="Training" divided>
                  <Fact label="Age group" value={student.age_group} />
                  <Fact label="Skill level" value={student.skill_level} />
                  <Fact label="Goals" value={student.goals} />
                </FactGroup>

                <FactGroup label="Safety" divided>
                  <Fact label="Medical notes" value={student.medical_notes} />
                  <Fact
                    label="Emergency contact"
                    value={
                      [student.emergency_contact_name, student.emergency_contact_phone]
                        .filter(Boolean)
                        .join('\n')
                    }
                  />
                </FactGroup>
              </dl>
            </Card>
          </aside>

          <div className="lg:col-span-2 space-y-8">
            {/* Instructor notes — the core of the record, so they lead */}
            <section>
              <SectionLabel
                label={`Notes · ${instructorNotes.length}`}
                action={{ label: 'View all', href: `/instructor/notes?student_id=${student.id}` }}
              />
              <Card padding="none">
                {instructorNotes.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <p className="text-charcoal-500 mb-4">No notes yet</p>
                    <Button variant="outline" size="sm" onClick={() => handleOpenNoteModal()}>
                      Write the first note
                    </Button>
                  </div>
                ) : (
                  <ul className="divide-y divide-champagne-200">
                    {instructorNotes.map((note: any) => {
                      const isOwnNote = note.author_id === profile?.id
                      return (
                        <li
                          key={note.id}
                          className={`px-6 py-5 group ${isOwnNote ? 'cursor-pointer hover:bg-champagne-100 focus-within:bg-champagne-100 transition-colors' : ''}`}
                          onClick={() => isOwnNote && handleOpenNoteModal(note)}
                          title={isOwnNote ? 'Click to edit' : undefined}
                        >
                          <div className="flex items-baseline justify-between gap-4">
                            {isOwnNote ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenNoteModal(note)
                                }}
                                className="font-serif text-lg font-semibold text-charcoal-950 text-left"
                              >
                                {note.title || 'Note'}
                              </button>
                            ) : (
                              <p className="font-serif text-lg font-semibold text-charcoal-950">
                                {note.title || 'Note'}
                              </p>
                            )}
                            <span className="flex items-center gap-3 shrink-0">
                              {isOwnNote && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteNote(note.id)
                                  }}
                                  className="text-xs text-charcoal-400 hover:text-rose-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                >
                                  Delete
                                </button>
                              )}
                              <time className="text-xs text-charcoal-400">
                                {new Date(note.created_at).toLocaleDateString()}
                              </time>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant={isOwnNote ? 'primary' : 'default'} size="sm">
                              {isOwnNote ? 'You' : note.author_name || 'Instructor'}
                            </Badge>
                            {note.class_name && (
                              <span className="text-xs text-charcoal-500">{note.class_name}</span>
                            )}
                            <span className="text-xs text-charcoal-400">
                              {VISIBILITY_LABELS[note.visibility] || note.visibility}
                            </span>
                          </div>
                          <div
                            className="prose prose-sm max-w-none text-charcoal-700 mt-3"
                            dangerouslySetInnerHTML={createSanitizedHtml(note.content)}
                          />
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {note.tags.map((tag: string) => (
                                <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </section>

            {/* Notes the dancer chose to share back */}
            <section>
              <SectionLabel
                label={`From the dancer · ${dancerNotes.length}`}
                action={{ label: 'View all', href: `/instructor/notes?student_id=${student.id}` }}
              />
              <Card padding="none">
                {dancerNotes.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-charcoal-500">Nothing shared yet</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-champagne-200">
                    {dancerNotes.map((note: any) => (
                      <li key={note.id} className="px-6 py-5">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="font-serif text-lg font-semibold text-charcoal-950">
                            {note.title || 'Note'}
                          </p>
                          <time className="text-xs text-charcoal-400 shrink-0">
                            {new Date(note.created_at).toLocaleDateString()}
                          </time>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="default" size="sm">
                            {note.author_name || 'Dancer'}
                          </Badge>
                          {note.class_name && (
                            <span className="text-xs text-charcoal-500">{note.class_name}</span>
                          )}
                        </div>
                        <div
                          className="prose prose-sm max-w-none text-charcoal-700 mt-3"
                          dangerouslySetInnerHTML={createSanitizedHtml(note.content)}
                        />
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {note.tags.map((tag: string) => (
                              <Badge key={tag} variant="default" size="sm">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section>
              <SectionLabel label={`Classes · ${enrollments.length}`} />
              <Card padding="none">
                {enrollments.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-charcoal-500">No enrollments yet</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-champagne-200">
                    {enrollments.map((enrollment: any) => (
                      <li key={enrollment.id} className="flex items-center justify-between gap-4 px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-charcoal-900 truncate">
                            {enrollment.class?.title}
                          </p>
                          <p className="text-xs text-charcoal-500 mt-0.5">
                            {new Date(enrollment.class?.start_time).toLocaleDateString()}
                          </p>
                        </div>
                        {enrollment.attendance_status && (
                          <Badge variant="default" size="sm">{enrollment.attendance_status}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section>
              <SectionLabel
                label={`Requests · ${requests.length}`}
                action={{ label: 'View all', href: '/instructor/requests' }}
              />
              <Card padding="none">
                {requests.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-charcoal-500">No requests</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-champagne-200">
                    {requests.map((request: any) => (
                      <li key={request.id}>
                        <Link
                          href="/instructor/requests"
                          className="flex items-start justify-between gap-4 px-6 py-4 hover:bg-champagne-100 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-charcoal-900">
                              {request.requested_focus}
                            </p>
                            {request.additional_notes && (
                              <p className="text-xs text-charcoal-500 mt-0.5">{request.additional_notes}</p>
                            )}
                          </div>
                          <Badge variant={request.status === 'pending' ? 'warning' : 'success'} size="sm">
                            {request.status}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>

            <section>
              <SectionLabel label={`Payments · ${payments.length}`} />
              <Card padding="none">
                {payments.length === 0 ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-charcoal-500">No payments recorded</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-champagne-200">
                    {payments.map((payment: any) => (
                      <li key={payment.id} className="flex items-center justify-between gap-4 px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-charcoal-900 tabular-nums">
                            ${payment.amount}
                          </p>
                          <p className="text-xs text-charcoal-500 mt-0.5">
                            {new Date(payment.transaction_date).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={payment.payment_status === 'confirmed' ? 'success' : 'warning'} size="sm">
                          {payment.payment_status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </div>
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
            <p className="text-sm text-charcoal-500">
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

      {showMergeModal && (
        <Modal
          isOpen={true}
          onClose={handleCloseMergeModal}
          title="Merge Student into Dancer Account"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-charcoal-500">
              Select an existing dancer account to merge this student into. All notes, enrollments, payments, and other data will be transferred to the selected account.
            </p>

            <div className="bg-champagne-100 rounded-lg p-3">
              <p className="text-sm font-medium text-charcoal-700 mb-1">Data to be transferred:</p>
              <ul className="text-sm text-charcoal-500 space-y-1">
                <li>{enrollments.length} enrollment(s)</li>
                <li>{notes.length} note(s)</li>
                <li>{payments.length} payment(s)</li>
                <li>{requests.length} lesson request(s)</li>
              </ul>
            </div>

            <div>
              {loadingLinkedStudents ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner size="sm" />
                  <span className="ml-2 text-sm text-charcoal-500">Loading dancer accounts...</span>
                </div>
              ) : linkedStudents.length === 0 ? (
                <p className="text-sm text-charcoal-400 py-2">No dancer accounts available to merge into.</p>
              ) : (
                <Select
                  label="Select Dancer Account"
                  value={selectedTargetId}
                  onChange={(e) => setSelectedTargetId(e.target.value)}
                  options={[
                    { value: '', label: 'Select a dancer account' },
                    ...linkedStudents.map((s) => ({
                      value: s.id,
                      label: `${s.profile?.full_name} (${s.profile?.email})`
                    }))
                  ]}
                />
              )}
            </div>

            <div className="bg-ballet-pink-50 border border-ballet-pink-200 rounded-lg p-3">
              <p className="text-sm text-ballet-pink-900">
                <strong>Warning:</strong> This action cannot be undone. The current student record will be deleted after the merge.
              </p>
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button
              variant="outline"
              onClick={handleCloseMergeModal}
              disabled={merging}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMerge}
              disabled={merging || !selectedTargetId || loadingLinkedStudents}
            >
              {merging ? 'Merging...' : 'Merge Students'}
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
              <label className="block text-sm font-medium text-charcoal-500 mb-1">
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
            <Select
              label="Related Class (optional)"
              value={noteFormData.class_id}
              onChange={(e) => setNoteFormData({ ...noteFormData, class_id: e.target.value })}
              options={[
                { value: '', label: 'General note (no specific class)' },
                ...enrollments.map((enrollment: any) => ({
                  value: enrollment.class_id,
                  label: `${enrollment.class?.title} · ${new Date(enrollment.class?.start_time).toLocaleDateString()}`
                }))
              ]}
              helperText="Link this note to a specific class the student is enrolled in"
            />
            <Select
              label="Visibility"
              value={noteFormData.visibility}
              onChange={(e) => setNoteFormData({ ...noteFormData, visibility: e.target.value })}
              options={[
                { value: 'shared_with_student', label: 'Share with dancer' },
                { value: 'shared_with_guardian', label: 'Share with guardian' },
                { value: 'private', label: 'Private (only you)' }
              ]}
            />
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

function SectionLabel({
  label,
  action,
}: {
  label: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex items-baseline justify-between mb-3">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">
        {label}
      </p>
      {action && (
        <Link
          href={action.href}
          className="text-sm text-rose-700 hover:text-rose-800 font-medium transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

function FactGroup({
  label,
  divided = false,
  children,
}: {
  label: string
  divided?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={divided ? 'border-t border-champagne-200 mt-5 pt-5' : ''}>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-charcoal-500">
        {label}
      </p>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-charcoal-500">{label}</dt>
      <dd className="text-sm text-charcoal-900 mt-0.5 break-words whitespace-pre-line">{value}</dd>
    </div>
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
            <Select
              label="Age Group"
              value={formData.age_group}
              onChange={(e) => setFormData({ ...formData, age_group: e.target.value })}
              options={[
                { value: '', label: 'Select age group...' },
                { value: 'Child (<13)', label: 'Child (<13)' },
                { value: 'Teen (13-18)', label: 'Teen (13-18)' },
                { value: 'Adult (+18)', label: 'Adult (+18)' }
              ]}
            />
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
              className="rounded border-champagne-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-charcoal-700">
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
