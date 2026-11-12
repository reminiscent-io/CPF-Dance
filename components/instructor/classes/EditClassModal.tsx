'use client'

import { useState, useEffect } from 'react'
import { useToast, Button, Input, Modal, ModalFooter } from '@/components/ui'
import type { Class, Studio, CreateClassData } from '@/lib/types'
import { convertUTCToET } from '@/lib/utils/et-timezone'
import { useNow } from '@/lib/hooks/use-now'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { dollarsToCents, formatCents } from '@/lib/utils/money'
import { AddNoteModal } from '@/components/AddNoteModal'
import { NoteDetailModal } from '@/components/NoteDetailModal'
import { ClassNotesSection, type ClassNote } from '@/components/instructor/ClassNotesSection'
import { noteButtonLabel, resolveNoteTarget, type NoteStudent } from '@/lib/utils/lesson-notes'
import type { CreateNoteData } from '@/lib/types'
import {
  ET,
  calculateRecurringDates,
  classTimesToUTC,
  getStudentDisplayName,
  getStudentEmail,
  loadEnrollments,
  type UnlinkedPurchase,
} from './class-helpers'
import {
  ClassAssetField,
  ClassCapacityField,
  ClassDescriptionField,
  ClassInstructorField,
  ClassLocationField,
  ClassPricingFields,
  ClassPublicField,
  ClassScheduleFields,
  ClassSignupLinkField,
  ClassStudioField,
  ClassTitleField,
  ClassTypeField,
  WeekdayPicker,
} from './ClassFormFields'
import { useClassForm, type ClassFormData } from './useClassForm'
import { WorkshopPricingFields } from './WorkshopPricingFields'

interface EditClassModalProps {
  classData: Class
  studios: Studio[]
  onClose: () => void
  onSubmit: (data: CreateClassData & { newStudioName?: string }, applyToSeries: boolean) => void
  onDelete: (scope: 'single' | 'series') => void
}

// Calculate initial duration from existing start_time and end_time
const calculateDuration = (start: string, end: string): number => {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000) // Convert to minutes
}

export function EditClassModal({ classData, studios, onClose, onSubmit, onDelete }: EditClassModalProps) {
  const { addToast } = useToast()
  const form = useClassForm<ClassFormData & { actual_attendance_count?: number }>({
    studio_id: classData.studio_id || '',
    class_type: classData.class_type,
    title: classData.title,
    description: classData.description || '',
    location: classData.location || '',
    start_time: convertUTCToET(classData.start_time),
    end_time: convertUTCToET(classData.end_time),
    max_capacity: classData.max_capacity || undefined,
    actual_attendance_count: classData.actual_attendance_count || undefined,
    pricing_model: classData.pricing_model || 'per_person',
    cost_per_person: classData.cost_per_person || undefined,
    base_cost: classData.base_cost || undefined,
    cost_per_hour: classData.cost_per_hour || undefined,
    tiered_base_students: classData.tiered_base_students || undefined,
    tiered_additional_cost: classData.tiered_additional_cost || undefined,
    price: classData.price || undefined, // Legacy field
    external_signup_url: classData.external_signup_url || '',
    is_public: classData.is_public || false,
    is_virtual: classData.is_virtual || false,
    newStudioName: '',
    instructor_id: classData.instructor_id || undefined,
    asset_id: classData.asset_id || null,
    workshop_price: classData.workshop_price ?? null,
    workshop_signup_url: classData.workshop_signup_url || '',
    workshop_full_only: classData.workshop_full_only || false
  }, calculateDuration(classData.start_time, classData.end_time))
  const { profile, students, formData, setFormData, durationMinutes } = form
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; full_name: string }[]>([])

  // Linked days of a multi-day workshop (or other recurring batch)
  const [series, setSeries] = useState<{ id: string; start_time: string; end_time: string; is_cancelled: boolean }[]>([])
  const [applyToSeries, setApplyToSeries] = useState(classData.class_type === 'workshop')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const now = useNow()
  const isWorkshop = classData.class_type === 'workshop'
  const otherUpcomingDays = series.filter(
    day => day.id !== classData.id && new Date(day.start_time).getTime() >= now.getTime()
  )
  // The readable /classes/<slug> link, minted on first open. Falls back to the
  // id link (which still works) if the slug can't be made, e.g. before
  // migration 51 has run. Only rendered once the modal opens, so window is there.
  const isShareable = classData.is_public && !classData.is_cancelled
  const { data: shareSlug, loading: loadingShareSlug } = useAsyncData(
    async (signal) => {
      const response = await fetch(`/api/classes/${classData.id}/share-link`, { method: 'POST', signal })
      if (!response.ok) throw new Error('Could not create signup link')
      const { slug } = await response.json()
      return slug as string
    },
    [classData.id],
    { enabled: isShareable }
  )
  const signupLink = `${window.location.origin}/classes/${shareSlug ?? classData.id}`
  // Stripe sales on this class's links that no dancer is tied to yet
  const { data: unlinkedPurchases, refetch: refetchPurchases } = useAsyncData(
    async (signal) => {
      const response = await fetch(`/api/classes/${classData.id}/purchases`, { signal })
      if (!response.ok) throw new Error('Could not load Stripe sales')
      const { purchases } = await response.json()
      return purchases as UnlinkedPurchase[]
    },
    [classData.id],
    { enabled: classData.is_public }
  )
  const linkPurchase = async (purchase: UnlinkedPurchase, studentId: string) => {
    try {
      const response = await fetch(`/api/classes/${classData.id}/purchases/${purchase.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId })
      })
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }))
        throw new Error(error || 'Failed to link sale')
      }
      refetchPurchases()
      addToast(`${purchase.buyer_name || 'Buyer'} enrolled`, 'success')
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to link sale', 'error')
    }
  }
  const seriesNoun = (n: number) =>
    isWorkshop ? (n === 1 ? 'day' : 'days') : (n === 1 ? 'class' : 'classes')

  // Notes tied to this class. Adding or reading one swaps the edit modal out
  // for the note modal (form state lives here, so nothing is lost) rather
  // than stacking two dialogs that would both close on Escape.
  const {
    data: classNotes,
    loading: loadingNotes,
    error: notesError,
    refetch: refetchNotes
  } = useAsyncData(
    async (signal) => {
      const response = await fetch(`/api/notes?class_id=${classData.id}`, { signal })
      if (!response.ok) throw new Error('Could not load notes')
      const { notes } = await response.json()
      return (notes || []) as ClassNote[]
    },
    [classData.id]
  )
  const [noteDraft, setNoteDraft] = useState<{ students: NoteStudent[]; initialStudentId?: string } | null>(null)
  const [openNote, setOpenNote] = useState<ClassNote | null>(null)
  const noteOverlayOpen = noteDraft !== null || openNote !== null

  const startNote = () => {
    const everyone: NoteStudent[] = students.map(s => ({ id: s.id, full_name: getStudentDisplayName(s) }))
    // A private lesson's note is about its dancer; any other class can be
    // about anyone, since group rosters are rarely complete.
    setNoteDraft(formData.class_type === 'private' ? resolveNoteTarget(enrolledStudents, everyone) : { students: everyone })
  }

  const submitNote = async (data: CreateNoteData) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, class_id: classData.id })
      })
      if (!response.ok) {
        const { error } = await response.json().catch(() => ({ error: null }))
        throw new Error(error || 'Failed to create note')
      }
      addToast('Note saved to this class', 'success')
      setNoteDraft(null)
      refetchNotes()
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to create note', 'error')
    }
  }

  // Recurring copy state
  const [showRecurringSection, setShowRecurringSection] = useState(false)
  const [recurringSelectedDays, setRecurringSelectedDays] = useState<number[]>([])
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false)

  // Fetch enrolled students and the linked series
  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (classData.class_type === 'private') {
        try {
          const loaded = await loadEnrollments(classData.id)
          if (!cancelled) setEnrolledStudents(loaded)
        } catch (error) {
          console.error('Error fetching enrollments:', error)
        }
      }

      if (classData.series_id) {
        try {
          const response = await fetch(`/api/classes/${classData.id}`)
          if (!response.ok) throw new Error('Failed to fetch class series')
          const result = await response.json()
          if (!cancelled) setSeries(result.series || [])
        } catch (error) {
          console.error('Error fetching class series:', error)
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [classData.id, classData.class_type, classData.series_id])

  const refreshEnrolledStudents = async () => {
    try {
      setEnrolledStudents(await loadEnrollments(classData.id))
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    }
  }

  const recurringCopyDates = showRecurringSection
    ? calculateRecurringDates(formData.start_time, recurringEndDate, recurringSelectedDays, false)
    : []

  // Handle creating recurring copies
  const handleCreateRecurringCopies = async () => {
    if (recurringCopyDates.length === 0) {
      addToast('Please select days and an end date', 'error')
      return
    }

    setIsCreatingRecurring(true)

    try {
      const classesToCreate = recurringCopyDates.map(dateStr => ({
        title: formData.title,
        description: formData.description,
        location: formData.location,
        class_type: formData.class_type,
        studio_id: formData.studio_id,
        max_capacity: formData.max_capacity,
        pricing_model: formData.pricing_model,
        cost_per_person: formData.cost_per_person,
        base_cost: formData.base_cost,
        cost_per_hour: formData.cost_per_hour,
        tiered_base_students: formData.tiered_base_students,
        tiered_additional_cost: formData.tiered_additional_cost,
        external_signup_url: formData.external_signup_url,
        is_public: formData.is_public,
        is_virtual: formData.is_virtual,
        asset_id: formData.asset_id,
        instructor_id: formData.instructor_id,
        // Private lessons carry their dancer into each copy
        student_id: formData.class_type === 'private' ? enrolledStudents[0]?.id : undefined,
        ...classTimesToUTC(dateStr, durationMinutes)
      }))

      const response = await fetch('/api/classes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // New days join this class's series, so they stay linked to it
        body: JSON.stringify({ classes: classesToCreate, link_to_class_id: classData.id })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create recurring classes')
      }

      const { classes: newClasses } = await response.json()
      addToast(
        isWorkshop
          ? `${newClasses.length} workshop ${newClasses.length === 1 ? 'day' : 'days'} added`
          : `${newClasses.length} recurring classes created successfully`,
        'success'
      )
      setShowRecurringSection(false)
      setRecurringSelectedDays([])
      setRecurringEndDate('')
      onClose()
      // Trigger a page refresh to show new classes
      window.location.reload()
    } catch (error) {
      console.error('Error creating recurring copies:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create recurring classes'
      addToast(errorMessage, 'error')
    } finally {
      setIsCreatingRecurring(false)
    }
  }

  const isLinkedWorkshop = isWorkshop && formData.class_type === 'workshop' && series.length > 1

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time || !durationMinutes) {
      return
    }

    // Submit with UTC times
    const { workshop_price, workshop_signup_url, workshop_full_only, ...rest } = formData
    onSubmit({
      ...rest,
      // Full-run pricing only applies to a linked workshop
      ...(isLinkedWorkshop ? { workshop_price, workshop_signup_url, workshop_full_only } : {}),
      ...classTimesToUTC(formData.start_time, durationMinutes)
    }, applyToSeries && otherUpcomingDays.length > 0)
  }

  const handleDeleteClick = () => {
    if (otherUpcomingDays.length > 0) {
      setConfirmingDelete(true)
    } else if (confirm('Are you sure you want to delete this class? This cannot be undone.')) {
      onDelete('single')
    }
  }

  const formatSeriesDay = (day: { start_time: string; end_time: string }) => {
    const start = new Date(day.start_time)
    const date = start.toLocaleString('en-US', { timeZone: ET, weekday: 'short', month: 'short', day: 'numeric' })
    const from = start.toLocaleString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' })
    const to = new Date(day.end_time).toLocaleString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' })
    return `${date} · ${from} - ${to}`
  }

  return (
    <>
    <Modal isOpen={!noteOverlayOpen} onClose={onClose} title="Edit Class" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <ClassTitleField form={form} />

          {/* Instructor selection - only for admins */}
          {profile?.role === 'admin' && <ClassInstructorField form={form} />}

          <ClassDescriptionField form={form} />

          {series.length > 1 && (
            <div className="p-4 bg-champagne-100 border border-champagne-200 rounded-lg space-y-3">
              <h4 className="text-sm font-medium text-charcoal-950">
                {isWorkshop ? `Workshop days (${series.length})` : `Classes in this series (${series.length})`}
              </h4>
              <ol className="space-y-1 text-sm">
                {series.map((day, index) => {
                  const isThisDay = day.id === classData.id
                  return (
                    <li
                      key={day.id}
                      className={`flex flex-wrap items-baseline gap-x-2 tabular-nums ${
                        day.is_cancelled
                          ? 'line-through text-charcoal-400'
                          : isThisDay ? 'font-medium text-charcoal-950' : 'text-charcoal-600'
                      }`}
                    >
                      <span className="w-14 shrink-0">{isWorkshop ? `Day ${index + 1}` : `${index + 1}.`}</span>
                      <span>{formatSeriesDay(day)}</span>
                      {isThisDay && <span className="text-xs text-rose-700">Editing</span>}
                    </li>
                  )
                })}
              </ol>

              {otherUpcomingDays.length > 0 && (
                <div className="pt-3 border-t border-champagne-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="apply_to_series"
                      checked={applyToSeries}
                      onChange={(e) => setApplyToSeries(e.target.checked)}
                      className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-champagne-200 rounded"
                    />
                    <label htmlFor="apply_to_series" className="text-sm font-medium text-charcoal-700 cursor-pointer">
                      Apply changes to the other {otherUpcomingDays.length} upcoming {seriesNoun(otherUpcomingDays.length)}
                    </label>
                  </div>
                  <p className="text-xs text-charcoal-500 mt-1 ml-6">
                    Title, description, studio, location, capacity, pricing, sign-up link and visibility.
                    Start time and length stay as set on each day. Past days keep their details.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="bg-champagne-100 border border-champagne-200 rounded-lg p-4 mb-4">
            <Input
              label="Actual Attendance (Override)"
              type="number"
              min="0"
              value={formData.actual_attendance_count || ''}
              onChange={(e) => setFormData({ ...formData, actual_attendance_count: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="text-xs text-charcoal-500 mt-1">
              Use this to manually set the actual number of students who attended. Leave blank to use enrollment count.
              Currently enrolled: {classData.enrolled_count || 0} students.
            </p>
          </div>

          <ClassStudioField form={form} studios={studios} />

          <ClassTypeField form={form} />

          {/* Student enrollment management for private lessons */}
          {formData.class_type === 'private' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3">
              <label className="block text-sm font-medium text-charcoal-700">
                Enrolled Students
              </label>

              {enrolledStudents.length > 0 ? (
                <div className="space-y-2">
                  {enrolledStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-2 bg-champagne-50 rounded border border-rose-200">
                      <span className="text-sm font-medium text-charcoal-950">{student.full_name}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Remove ${student.full_name} from this lesson?`)) {
                            try {
                              const response = await fetch(`/api/classes/${classData.id}/enrollments/${student.id}`, {
                                method: 'DELETE'
                              })
                              if (response.ok) {
                                setEnrolledStudents(enrolledStudents.filter(s => s.id !== student.id))
                                addToast('Student removed from lesson', 'success')
                              } else {
                                throw new Error('Failed to remove student')
                              }
                            } catch (error) {
                              addToast('Failed to remove student', 'error')
                            }
                          }
                        }}
                        className="text-xs text-rose-700 hover:text-rose-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-charcoal-500">No students enrolled yet</p>
              )}

              <div className="pt-2 border-t border-rose-200">
                <label className="block text-xs font-medium text-charcoal-700 mb-1">
                  Add Student
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  onChange={async (e) => {
                    const studentId = e.target.value
                    if (studentId) {
                      try {
                        const response = await fetch(`/api/classes/${classData.id}/enrollments`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ student_id: studentId })
                        })
                        if (response.ok) {
                          await refreshEnrolledStudents()
                          addToast('Student enrolled successfully', 'success')
                          e.target.value = ''
                        } else {
                          throw new Error('Failed to enroll student')
                        }
                      } catch (error) {
                        addToast('Failed to enroll student', 'error')
                      }
                    }
                  }}
                >
                  <option value="">Select a student to add...</option>
                  {students
                    .filter(s => !enrolledStudents.find(es => es.id === s.id))
                    .map(student => (
                      <option key={student.id} value={student.id}>
                        {getStudentDisplayName(student)} {getStudentEmail(student) && `(${getStudentEmail(student)})`}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          <ClassNotesSection
            notes={classNotes}
            loading={loadingNotes}
            error={notesError}
            addLabel={formData.class_type === 'private' ? noteButtonLabel(enrolledStudents) : 'Add note'}
            onAdd={startNote}
            onOpen={setOpenNote}
          />

          {formData.class_type === 'private' && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
              <input
                type="checkbox"
                id="edit_is_virtual"
                checked={formData.is_virtual || false}
                onChange={(e) => setFormData({ ...formData, is_virtual: e.target.checked })}
                className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-champagne-200 rounded"
              />
              <label htmlFor="edit_is_virtual" className="text-sm font-medium text-charcoal-700 cursor-pointer">
                Virtual lesson (Google Meet) — a meeting link is created and shared with the dancer
              </label>
            </div>
          )}

          <ClassLocationField form={form} />

          {/* Meet link for the instructor to copy — useful when the dancer has no
              email and so didn't receive the link automatically. */}
          {classData.is_virtual && classData.class_type === 'private' && classData.google_meet_url && (
            <div className="p-3 bg-champagne-100 border border-champagne-200 rounded-lg space-y-2">
              <label className="block text-sm font-medium text-charcoal-700">Google Meet link</label>
              <div className="flex items-center gap-2">
                <a
                  href={classData.google_meet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm text-rose-700 hover:text-rose-800 underline"
                >
                  {classData.google_meet_url}
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(classData.google_meet_url!)
                      addToast('Meet link copied to clipboard', 'success')
                    } catch {
                      addToast('Could not copy link', 'error')
                    }
                  }}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-charcoal-500">
                Share this link with the dancer manually if they have no email on file.
              </p>
            </div>
          )}

          <ClassScheduleFields form={form} />

          <ClassCapacityField form={form} />

          <ClassSignupLinkField form={form} />

          <ClassPublicField form={form} id="edit_is_public" />

          {/* Share link for a saved public class. It opens a public preview,
              and its buttons go through sign-in straight to this class. */}
          {isShareable && (
            <div className="p-3 bg-champagne-100 border border-champagne-200 rounded-lg space-y-2">
              <label className="block text-sm font-medium text-charcoal-700">Signup link</label>
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm text-charcoal-700">
                  {loadingShareSlug ? 'Creating link…' : signupLink}
                </span>
                <button
                  type="button"
                  disabled={loadingShareSlug}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(signupLink)
                      addToast('Signup link copied to clipboard', 'success')
                    } catch {
                      addToast('Could not copy link', 'error')
                    }
                  }}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-charcoal-500">
                Anyone with this link can see the class. Signing in or creating an account takes them straight to enroll.
              </p>
            </div>
          )}

          {/* Paid on Stripe from the raw link, with no dancer to enroll yet.
              Linking enrolls the dancer in what they bought. */}
          {unlinkedPurchases && unlinkedPurchases.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-2">
              <label className="block text-sm font-medium text-charcoal-700">
                Paid on Stripe, not yet linked ({unlinkedPurchases.length})
              </label>
              <div className="space-y-2">
                {unlinkedPurchases.map(purchase => (
                  <div key={purchase.id} className="p-2 bg-champagne-50 rounded border border-rose-200 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-charcoal-950">{purchase.buyer_name || 'Unknown buyer'}</span>
                      <span className="text-xs tabular-nums text-charcoal-500">
                        {formatCents(dollarsToCents(Number(purchase.amount_paid)))}
                        {purchase.workshop_option === 'full' ? ' · full workshop' : purchase.workshop_option === 'day' ? ' · one day' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-charcoal-500 truncate">
                      {[
                        purchase.buyer_email,
                        purchase.buyer_phone,
                        new Date(purchase.purchased_at).toLocaleDateString('en-US', { timeZone: ET, month: 'short', day: 'numeric' }),
                      ].filter(Boolean).join(' · ')}
                    </div>
                    <select
                      className="w-full px-3 py-2 text-sm border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) linkPurchase(purchase, e.target.value)
                      }}
                    >
                      <option value="">Link to a student…</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {getStudentDisplayName(student)} {getStudentEmail(student) && `(${getStudentEmail(student)})`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-charcoal-500">
                These buyers paid from the Stripe link without a matching account. No student record yet? Add them on the Students page first.
              </p>
            </div>
          )}

          <ClassPricingFields form={form} />

          {isLinkedWorkshop && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <WorkshopPricingFields
                values={formData}
                onChange={(patch) => setFormData({ ...formData, ...patch })}
              />
            </div>
          )}

          {/* Create Recurring Copies Section */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-charcoal-950">
                  {isWorkshop ? 'Add Workshop Days' : 'Create Recurring Copies'}
                </h4>
                <p className="text-xs text-charcoal-500">
                  {isWorkshop
                    ? 'New days are linked to this workshop'
                    : formData.class_type === 'private' && enrolledStudents[0]
                      ? `Generate additional lessons for ${enrolledStudents[0].full_name}`
                      : 'Generate additional classes based on this one'}
                </p>
              </div>
              <Button
                type="button"
                variant={showRecurringSection ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setShowRecurringSection(!showRecurringSection)}
              >
                {showRecurringSection ? 'Hide' : 'Setup'}
              </Button>
            </div>

            {showRecurringSection && (
              <>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    Create copies on these days *
                  </label>
                  <WeekdayPicker selectedDays={recurringSelectedDays} onChange={setRecurringSelectedDays} />
                </div>

                <Input
                  label="Create copies until (end date) *"
                  type="date"
                  value={recurringEndDate}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                  min={formData.start_time ? formData.start_time.split('T')[0] : undefined}
                />

                {recurringCopyDates.length > 0 && (
                  <div className="text-sm text-rose-700 bg-rose-100 px-3 py-2 rounded">
                    This will create <strong>{recurringCopyDates.length}</strong> additional {isWorkshop ? 'workshop days' : 'classes'}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleCreateRecurringCopies}
                  disabled={isCreatingRecurring || recurringCopyDates.length === 0}
                  loading={isCreatingRecurring}
                  className="w-full"
                >
                  {isCreatingRecurring ? (
                    'Creating...'
                  ) : (
                    isWorkshop
                      ? `Add ${recurringCopyDates.length} Workshop ${recurringCopyDates.length === 1 ? 'Day' : 'Days'}`
                      : `Create ${recurringCopyDates.length} Recurring Classes`
                  )}
                </Button>
              </>
            )}
          </div>

          {/* Asset Selection */}
          <ClassAssetField form={form} />
        </div>

        {confirmingDelete && (
          <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3">
            <p className="text-sm text-charcoal-700">
              {isWorkshop ? 'This day is part of a workshop.' : 'This class is part of a series.'} Delete just
              this one, or this one and the other {otherUpcomingDays.length} upcoming {seriesNoun(otherUpcomingDays.length)}?
              This cannot be undone.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onDelete('single')}>
                Delete this {isWorkshop ? 'day' : 'class'} only
              </Button>
              <Button type="button" size="sm" onClick={() => onDelete('series')}>
                Delete all {otherUpcomingDays.length + 1} {seriesNoun(otherUpcomingDays.length + 1)}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Keep
              </Button>
            </div>
          </div>
        )}

        <ModalFooter className="mt-6">
          <button type="button" onClick={handleDeleteClick} className="text-rose-700 hover:text-rose-800 hover:bg-rose-50 p-2 rounded transition-colors" title="Delete class">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
          <div className="flex-1"></div>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>

    {noteDraft && (
      <AddNoteModal
        students={noteDraft.students}
        initialStudentId={noteDraft.initialStudentId}
        initialClassId={classData.id}
        onClose={() => setNoteDraft(null)}
        onSubmit={submitNote}
      />
    )}

    {openNote && (
      <NoteDetailModal
        key={openNote.id}
        note={openNote}
        isOwn={openNote.author_id === profile?.id}
        onClose={() => setOpenNote(null)}
        onBack={() => setOpenNote(null)}
        onSaved={() => {
          setOpenNote(null)
          refetchNotes()
        }}
      />
    )}
    </>
  )
}
