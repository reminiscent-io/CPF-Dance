'use client'

import { useState } from 'react'
import { Button, Input, Modal, ModalFooter } from '@/components/ui'
import type { Studio, CreateClassData } from '@/lib/types'
import {
  calculateRecurringDates,
  classTimesToUTC,
  getStudentDisplayName,
  getStudentEmail,
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

interface CreateClassModalProps {
  studios: Studio[]
  onClose: () => void
  onSubmit: (data: CreateClassData & { newStudioName?: string; recurringClasses?: CreateClassData[] }) => void
}

export function CreateClassModal({ studios, onClose, onSubmit }: CreateClassModalProps) {
  const form = useClassForm<ClassFormData & { student_id?: string }>({
    studio_id: '',
    class_type: 'group',
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    max_capacity: undefined,
    pricing_model: 'per_person',
    cost_per_person: undefined,
    base_cost: undefined,
    cost_per_hour: undefined,
    tiered_base_students: undefined,
    tiered_additional_cost: undefined,
    price: undefined, // Legacy field
    external_signup_url: '',
    is_public: false,
    is_virtual: false,
    newStudioName: '',
    instructor_id: undefined,
    student_id: undefined,
    asset_id: null
  }, 60) // Default 1 hour
  const { profile, students, formData, setFormData, durationMinutes } = form
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Recurring class state
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([]) // 0=Sunday, 1=Monday, etc.
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingClassDates, setPendingClassDates] = useState<string[]>([])

  // Recurring class dates as ET datetime-local strings, first class included
  const calculateDates = () => calculateRecurringDates(formData.start_time, recurringEndDate, selectedDays, true)

  const recurringDates = isRecurring ? calculateDates() : []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time || !durationMinutes) {
      return
    }

    // For recurring classes, validate and check count
    if (isRecurring) {
      if (selectedDays.length === 0) {
        return // Need at least one day selected
      }
      if (!recurringEndDate) {
        return // Need an end date
      }

      const dateStrings = calculateDates()
      if (dateStrings.length === 0) {
        return
      }

      // Show confirmation dialog if more than 20 classes
      if (dateStrings.length > 20) {
        setPendingClassDates(dateStrings)
        setShowConfirmDialog(true)
        return
      }

      // Proceed with creating multiple classes
      submitRecurringClasses(dateStrings)
      return
    }

    // Submit with UTC times
    onSubmit({
      ...formData,
      ...classTimesToUTC(formData.start_time, durationMinutes)
    })
  }

  const submitRecurringClasses = (dateStrings: string[]) => {
    // Each dateString is in ET datetime-local format (e.g., "2024-12-15T14:00")
    // Convert each to UTC and create class data
    const classesToCreate = dateStrings.map(dateStr => ({
      ...formData,
      ...classTimesToUTC(dateStr, durationMinutes)
    }))

    // Pass all classes to parent via a special property
    onSubmit({
      ...formData,
      // The first class's times stand for the whole submission
      ...classTimesToUTC(dateStrings[0], durationMinutes),
      recurringClasses: classesToCreate
    })
  }

  const handleConfirmRecurring = () => {
    setShowConfirmDialog(false)
    submitRecurringClasses(pendingClassDates)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Class" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* 1. Class Title */}
          <ClassTitleField form={form} />

          {/* 2. Class Type */}
          <ClassTypeField form={form} />

          {/* 3. Start Time + Length */}
          <ClassScheduleFields form={form} />

          {/* 4. Studio */}
          <ClassStudioField form={form} studios={studios} />

          {/* 5. Student selection for private lessons */}
          {formData.class_type === 'private' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Student (Optional)
              </label>
              <select
                className="w-full px-4 py-2 border border-champagne-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={formData.student_id || ''}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              >
                <option value="">Select a student</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {getStudentDisplayName(student)} {getStudentEmail(student) && `(${getStudentEmail(student)})`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-rose-700 mt-2">
                Select a student to automatically enroll them in this private lesson
              </p>

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-rose-200">
                <input
                  type="checkbox"
                  id="create_is_virtual"
                  checked={formData.is_virtual || false}
                  onChange={(e) => setFormData({ ...formData, is_virtual: e.target.checked })}
                  className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-champagne-200 rounded"
                />
                <label htmlFor="create_is_virtual" className="text-sm font-medium text-charcoal-700 cursor-pointer">
                  Virtual lesson (Google Meet)
                </label>
              </div>
              <p className="text-xs text-rose-700 mt-2">
                Creates a Google Meet link on Courtney&rsquo;s calendar and shares it with the enrolled dancer
                by email and in the app.
              </p>
            </div>
          )}

          {/* 5. Pricing */}
          <ClassPricingFields form={form} />

          {/* Repeat — sits outside Advanced so private lessons can be booked as a series */}
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring_toggle"
                checked={isRecurring}
                onChange={(e) => {
                  setIsRecurring(e.target.checked)
                  if (!e.target.checked) {
                    setSelectedDays([])
                    setRecurringEndDate('')
                  }
                }}
                className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-champagne-200 rounded"
              />
              <label htmlFor="recurring_toggle" className="text-sm font-medium text-charcoal-700 cursor-pointer">
                {formData.class_type === 'private'
                  ? 'Repeat this lesson'
                  : formData.class_type === 'workshop'
                    ? 'This workshop runs over several days'
                    : 'Make this a recurring class'}
              </label>
            </div>

            {isRecurring && (
              <>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-2">
                    {formData.class_type === 'workshop' ? 'Workshop meets on *' : 'Repeat on these days *'}
                  </label>
                  <WeekdayPicker selectedDays={selectedDays} onChange={setSelectedDays} />
                </div>

                <Input
                  label={formData.class_type === 'workshop' ? 'Last day of the workshop *' : 'Repeat until (end date) *'}
                  type="date"
                  required={isRecurring}
                  value={recurringEndDate}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                  min={formData.start_time ? formData.start_time.split('T')[0] : undefined}
                />

                {recurringDates.length > 0 && (
                  <div className="text-sm text-rose-700 bg-rose-100 px-3 py-2 rounded">
                    This will create <strong>{recurringDates.length}</strong> {formData.class_type === 'private' ? 'lessons' : formData.class_type === 'workshop' ? 'linked workshop days' : 'classes'}
                    {formData.class_type === 'private' && formData.student_id && ', each with the selected student enrolled'}
                    {recurringDates.length > 20 && (
                      <span className="text-rose-800"> (confirmation required)</span>
                    )}
                  </div>
                )}

                {formData.class_type === 'workshop' && (
                  <WorkshopPricingFields
                    values={formData}
                    onChange={(patch) => setFormData({ ...formData, ...patch })}
                  />
                )}
              </>
            )}
          </div>

          {/* Advanced Section Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-charcoal-500 hover:text-charcoal-700 transition-colors w-full py-2"
          >
            <span className="text-xs">{showAdvanced ? '\u25BE' : '\u25B8'}</span>
            Advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-4 pl-2 border-l-2 border-champagne-200">
              {/* Location */}
              <ClassLocationField form={form} />

              {/* Description */}
              <ClassDescriptionField form={form} />

              {/* Max Capacity */}
              <ClassCapacityField form={form} />

              {/* Asset Selection */}
              <ClassAssetField form={form} />

              {/* Instructor selection - only for admins */}
              {profile?.role === 'admin' && <ClassInstructorField form={form} />}

              {/* External Sign-up Link */}
              <ClassSignupLinkField form={form} />

              {/* Make Class Public */}
              <ClassPublicField form={form} id="create_is_public" />


            </div>
          )}
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {isRecurring && recurringDates.length > 1
              ? `Create ${recurringDates.length} Classes`
              : 'Create Class'}
          </Button>
        </ModalFooter>
      </form>

      {/* Confirmation Dialog for Many Classes */}
      {showConfirmDialog && (
        <Modal isOpen={true} onClose={() => setShowConfirmDialog(false)} title="Confirm Bulk Creation" size="md">
          <div className="space-y-4">
            <p className="text-charcoal-700">
              You are about to create <strong className="text-rose-700">{pendingClassDates.length}</strong> classes.
            </p>
            <p className="text-sm text-charcoal-500">
              This will create individual classes for each scheduled date. Are you sure you want to proceed?
            </p>
            <div className="max-h-40 overflow-y-auto bg-champagne-100 rounded-lg p-3">
              <p className="text-xs text-charcoal-500 mb-2">Scheduled dates (Eastern Time):</p>
              <ul className="text-sm text-charcoal-700 space-y-1">
                {pendingClassDates.slice(0, 10).map((dateStr, i) => {
                  // Parse datetime-local string for display
                  const [datePart, timePart] = dateStr.split('T')
                  const [year, month, day] = datePart.split('-').map(Number)
                  const [hour, minute] = timePart.split(':').map(Number)
                  const displayDate = new Date(year, month - 1, day)
                  const ampm = hour >= 12 ? 'PM' : 'AM'
                  const displayHour = hour % 12 || 12
                  return (
                    <li key={i}>
                      {displayDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' at '}
                      {displayHour}:{String(minute).padStart(2, '0')} {ampm} ET
                    </li>
                  )
                })}
                {pendingClassDates.length > 10 && (
                  <li className="text-charcoal-500 italic">...and {pendingClassDates.length - 10} more</li>
                )}
              </ul>
            </div>
          </div>
          <ModalFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmRecurring}>
              Yes, Create {pendingClassDates.length} Classes
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </Modal>
  )
}
