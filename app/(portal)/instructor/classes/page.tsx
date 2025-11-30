'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Badge, Modal, ModalFooter, Input, Textarea, useToast, Spinner, GooglePlacesInput, PlaceDetails } from '@/components/ui'
import type { Class, Studio, CreateClassData, ClassType, PricingModel } from '@/lib/types'
import { getPricingModelDescription, formatPrice } from '@/lib/utils/pricing'
import { convertETToUTC, convertUTCToET } from '@/lib/utils/et-timezone'

export default function ClassesPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [classes, setClasses] = useState<Class[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [filterStudio, setFilterStudio] = useState<string>('')
  const [filterType, setFilterType] = useState<ClassType | ''>('')
  const [upcomingOnly, setUpcomingOnly] = useState(true)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'studio' ? 'studio' : 'dancer'}`)
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchClasses()
      fetchStudios()
    }
  }, [user, filterStudio, filterType, upcomingOnly])

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams()
      if (filterStudio) params.append('studio_id', filterStudio)
      if (filterType) params.append('class_type', filterType)
      if (upcomingOnly) params.append('upcoming', 'true')
      
      const response = await fetch(`/api/classes?${params}`)
      if (!response.ok) throw new Error('Failed to fetch classes')
      
      const data = await response.json()
      setClasses(data.classes || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
      addToast('Failed to load classes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudios = async () => {
    try {
      const response = await fetch('/api/studios?is_active=true')
      if (!response.ok) throw new Error('Failed to fetch studios')
      
      const data = await response.json()
      setStudios(data.studios || [])
    } catch (error) {
      console.error('Error fetching studios:', error)
    }
  }

  const handleCreateClass = async (formData: CreateClassData & { newStudioName?: string; recurringClasses?: any[] }) => {
    try {
      let studioId = formData.studio_id

      // If a new studio name is provided, create it first
      if (formData.newStudioName && formData.newStudioName.trim()) {
        const studioResponse = await fetch('/api/studios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.newStudioName.trim(),
            is_active: true
          })
        })

        if (!studioResponse.ok) {
          const errorData = await studioResponse.json()
          throw new Error(errorData.error || 'Failed to create studio')
        }

        const { studio } = await studioResponse.json()
        studioId = studio.id

        // Refresh studios list
        fetchStudios()
        addToast(`Studio "${formData.newStudioName}" created successfully`, 'success')
      }

      // Check if this is a recurring class submission
      if (formData.recurringClasses && formData.recurringClasses.length > 0) {
        // Create multiple classes
        const classesToCreate = formData.recurringClasses.map(classItem => ({
          ...classItem,
          studio_id: studioId
        }))

        // Use bulk creation endpoint
        const response = await fetch('/api/classes/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classes: classesToCreate })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to create classes')
        }

        const { classes: newClasses } = await response.json()
        setClasses(prev => [...newClasses, ...prev])
        setShowCreateModal(false)
        addToast(`${newClasses.length} classes created successfully`, 'success')
        return
      }

      // Create a single class
      const classData = { ...formData, studio_id: studioId }
      delete (classData as any).newStudioName // Remove the temporary field
      delete (classData as any).recurringClasses // Remove the recurring field

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to create class')
      }

      const { class: newClass } = await response.json()
      setClasses(prev => [newClass, ...prev])
      setShowCreateModal(false)
      addToast('Class created successfully', 'success')
    } catch (error) {
      console.error('Error creating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class'
      addToast(errorMessage, 'error')
    }
  }

  const handleUpdateClass = async (classId: string, formData: CreateClassData & { newStudioName?: string }) => {
    try {
      let studioId = formData.studio_id

      // If a new studio name is provided, create it first
      if (formData.newStudioName && formData.newStudioName.trim()) {
        const studioResponse = await fetch('/api/studios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.newStudioName.trim(),
            is_active: true
          })
        })

        if (!studioResponse.ok) {
          const errorData = await studioResponse.json()
          throw new Error(errorData.error || 'Failed to create studio')
        }

        const { studio } = await studioResponse.json()
        studioId = studio.id

        // Refresh studios list
        fetchStudios()
        addToast(`Studio "${formData.newStudioName}" created successfully`, 'success')
      }

      // Update the class with the studio_id (either selected or newly created)
      const classData = { ...formData, studio_id: studioId }
      delete (classData as any).newStudioName // Remove the temporary field

      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to update class')
      }

      const { class: updatedClass } = await response.json()
      setClasses(prev => prev.map(cls => cls.id === classId ? updatedClass : cls))
      setShowEditModal(false)
      setSelectedClass(null)
      addToast('Class updated successfully', 'success')
    } catch (error) {
      console.error('Error updating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update class'
      addToast(errorMessage, 'error')
    }
  }

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete class')
      }

      setClasses(prev => prev.filter(cls => cls.id !== classId))
      setShowEditModal(false)
      setSelectedClass(null)
      addToast('Class deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete class'
      addToast(errorMessage, 'error')
    }
  }

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls)
    setShowEditModal(true)
  }

  if (authLoading || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-600 mt-1">Manage your class schedule</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Class
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            value={filterStudio}
            onChange={(e) => setFilterStudio(e.target.value)}
          >
            <option value="">All Studios</option>
            {studios.map(studio => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ClassType | '')}
          >
            <option value="">All Types</option>
            <option value="group">Group</option>
            <option value="private">Private</option>
            <option value="workshop">Workshop</option>
            <option value="master_class">Master Class</option>
          </select>

          <Button
            variant={upcomingOnly ? 'primary' : 'outline'}
            onClick={() => setUpcomingOnly(!upcomingOnly)}
          >
            {upcomingOnly ? 'Upcoming Only' : 'All Classes'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-600">
            No classes found
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls: any) => (
            <Card
              key={cls.id}
              hover
              className="cursor-pointer"
              onClick={() => handleClassClick(cls)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">{cls.title}</h3>
                {cls.is_cancelled ? (
                  <Badge variant="danger">Cancelled</Badge>
                ) : (
                  <Badge variant="primary">{cls.class_type.replace('_', ' ')}</Badge>
                )}
              </div>

              {cls.instructor_name && (
                <p className="text-sm text-gray-700 font-medium mb-2">
                  👤 {cls.instructor_name}
                </p>
              )}

              {cls.studio && (
                <p className="text-sm text-gray-600 mb-2">
                  📍 {cls.studio.name}
                  {cls.studio.city && `, ${cls.studio.city}`}
                </p>
              )}

              <p className="text-sm text-gray-600 mb-3">
                📅 {new Date(cls.start_time).toLocaleString('en-US', {
                  timeZone: 'America/New_York',
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })} ET
              </p>

              {cls.description && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{cls.description}</p>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {cls.actual_attendance_count !== null && cls.actual_attendance_count !== undefined
                    ? `${cls.actual_attendance_count} attended`
                    : `${cls.enrolled_count || 0}${cls.max_capacity ? ` / ${cls.max_capacity}` : ''} enrolled`}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {getPricingModelDescription(cls)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateClassModal
          studios={studios}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateClass}
        />
      )}

      {showEditModal && selectedClass && (
        <EditClassModal
          classData={selectedClass}
          studios={studios}
          onClose={() => {
            setShowEditModal(false)
            setSelectedClass(null)
          }}
          onSubmit={(formData) => handleUpdateClass(selectedClass.id, formData)}
          onDelete={() => handleDeleteClass(selectedClass.id)}
        />
      )}
    </PortalLayout>
  )
}

interface EditClassModalProps {
  classData: Class
  studios: Studio[]
  onClose: () => void
  onSubmit: (data: CreateClassData & { newStudioName?: string }) => void
  onDelete: () => void
}

function EditClassModal({ classData, studios, onClose, onSubmit, onDelete }: EditClassModalProps) {
  const { profile } = useUser()
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([])

  const [formData, setFormData] = useState<CreateClassData & { newStudioName?: string; actual_attendance_count?: number; instructor_id?: string }>({
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
    newStudioName: '',
    instructor_id: (classData as any).instructor_id || undefined
  })
  const [isCreatingNewStudio, setIsCreatingNewStudio] = useState(false)

  // Fetch instructors for admin users
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchInstructors()
    }
  }, [profile])

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/profiles?role=instructor')
      if (!response.ok) throw new Error('Failed to fetch instructors')
      const data = await response.json()
      setInstructors(data.profiles || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    }
  }

  // Calculate initial duration from existing start_time and end_time
  const calculateDuration = (start: string, end: string): number => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return Math.round((endDate.getTime() - startDate.getTime()) / 60000) // Convert to minutes
  }

  const [durationMinutes, setDurationMinutes] = useState(
    calculateDuration(classData.start_time, classData.end_time)
  )

  // Helper function to format duration for display
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}hr`
    return `${hours}hr ${mins}min`
  }

  // Round datetime to nearest 5-minute interval (Eastern Time)
  const roundToNearestFiveMinutes = (dateTimeString: string): string => {
    if (!dateTimeString) return dateTimeString
    // dateTimeString is in datetime-local format (Eastern Time)
    const [datePart, timePart] = dateTimeString.split('T')
    const [hours, minutes] = timePart.split(':')
    const minuteNum = parseInt(minutes)
    const roundedMinutes = Math.round(minuteNum / 5) * 5
    const newMinutes = String(roundedMinutes % 60).padStart(2, '0')
    const newHours = String(Math.floor(roundedMinutes / 60) + parseInt(hours)).padStart(2, '0')
    return `${datePart}T${newHours}:${newMinutes}`
  }

  // Generate duration options in 5-minute increments
  const durationOptions = [
    15, 20, 25, 30, 35, 40, 45, 50, 55, 60, // up to 1 hour
    75, 90, 105, 120, // 1.25hr, 1.5hr, 1.75hr, 2hr
    150, 180, 210, 240 // 2.5hr, 3hr, 3.5hr, 4hr
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time || !durationMinutes) {
      return
    }

    // Calculate end_time from start_time + duration (in Eastern Time format)
    const [datePart, timePart] = formData.start_time.split('T')
    const [hours, minutes] = timePart.split(':')
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes) + durationMinutes
    const endHours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
    const endMinutes = String(totalMinutes % 60).padStart(2, '0')
    const endTimeET = `${datePart}T${endHours}:${endMinutes}`

    // Submit with UTC conversion
    onSubmit({
      ...formData,
      start_time: convertETToUTC(formData.start_time),
      end_time: convertETToUTC(endTimeET)
    })
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Class" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Class Title *"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          {/* Instructor selection - only for admins */}
          {profile?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor (leave blank to use yourself)
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={formData.instructor_id || ''}
                onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
              >
                <option value="">Use me as the instructor</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Textarea
            label="Description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <Input
              label="Actual Attendance (Override)"
              type="number"
              min="0"
              value={formData.actual_attendance_count || ''}
              onChange={(e) => setFormData({ ...formData, actual_attendance_count: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <p className="text-xs text-gray-600 mt-1">
              Use this to manually set the actual number of students who attended. Leave blank to use enrollment count.
              Currently enrolled: {classData.enrolled_count || 0} students.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Studio
            </label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="studioOption"
                  checked={!isCreatingNewStudio}
                  onChange={() => {
                    setIsCreatingNewStudio(false)
                    setFormData({ ...formData, newStudioName: '' })
                  }}
                  className="mr-2 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700">Select existing</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="studioOption"
                  checked={isCreatingNewStudio}
                  onChange={() => {
                    setIsCreatingNewStudio(true)
                    setFormData({ ...formData, studio_id: '' })
                  }}
                  className="mr-2 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700">Create new</span>
              </label>
            </div>

            {isCreatingNewStudio ? (
              <Input
                placeholder="Enter new studio name"
                value={formData.newStudioName || ''}
                onChange={(e) => setFormData({ ...formData, newStudioName: e.target.value })}
              />
            ) : (
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={formData.studio_id}
                onChange={(e) => setFormData({ ...formData, studio_id: e.target.value })}
              >
                <option value="">Select a studio</option>
                {studios.map(studio => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Type *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.class_type}
              onChange={(e) => setFormData({ ...formData, class_type: e.target.value as ClassType })}
            >
              <option value="group">Group</option>
              <option value="private">Private</option>
              <option value="workshop">Workshop</option>
              <option value="master_class">Master Class</option>
            </select>
          </div>

          <GooglePlacesInput
            label="Location"
            value={formData.location || ''}
            onChange={(value) => setFormData({ ...formData, location: value })}
            placeholder="Search for class location..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Time (ET) *"
              type="datetime-local"
              step="300"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Length *
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              >
                {durationOptions.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Max Capacity"
            type="number"
            min="1"
            value={formData.max_capacity || ''}
            onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value ? parseInt(e.target.value) : undefined })}
          />

          <Input
            label="External Sign-up Link"
            type="url"
            placeholder="https://eventbrite.com/..."
            value={formData.external_signup_url || ''}
            onChange={(e) => setFormData({ ...formData, external_signup_url: e.target.value })}
          />
          <p className="text-xs text-gray-600 -mt-2 mb-2">
            Optional: Add a URL for classes booked through external platforms (e.g., Eventbrite)
          </p>

          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <input
              type="checkbox"
              id="edit_is_public"
              checked={formData.is_public || false}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
            />
            <label htmlFor="edit_is_public" className="text-sm font-medium text-gray-700 cursor-pointer">
              Make class public for dancers and guardians to view and enroll
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pricing Model *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.pricing_model || 'per_person'}
              onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value as PricingModel })}
            >
              <option value="per_person">Per Person</option>
              <option value="per_class">Per Class (Flat Rate)</option>
              <option value="per_hour">Per Hour</option>
              <option value="tiered">Tiered (Base + Additional)</option>
            </select>
          </div>

          {/* Conditional pricing fields based on selected model */}
          {formData.pricing_model === 'per_person' && (
            <Input
              label="Cost Per Person ($) *"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.cost_per_person || ''}
              onChange={(e) => setFormData({ ...formData, cost_per_person: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 25.00"
            />
          )}

          {formData.pricing_model === 'per_class' && (
            <Input
              label="Base Cost (Flat Rate) ($) *"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.base_cost || ''}
              onChange={(e) => setFormData({ ...formData, base_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 150.00"
            />
          )}

          {formData.pricing_model === 'per_hour' && (
            <Input
              label="Cost Per Hour ($) *"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.cost_per_hour || ''}
              onChange={(e) => setFormData({ ...formData, cost_per_hour: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 75.00"
            />
          )}

          {formData.pricing_model === 'tiered' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Set a base cost for the first X students, then charge per additional student</p>
              <Input
                label="Base Cost ($) *"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.base_cost || ''}
                onChange={(e) => setFormData({ ...formData, base_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 100.00"
              />
              <Input
                label="Students Included in Base Cost *"
                type="number"
                min="1"
                required
                value={formData.tiered_base_students || ''}
                onChange={(e) => setFormData({ ...formData, tiered_base_students: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="e.g., 5"
              />
              <Input
                label="Cost Per Additional Student ($) *"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.tiered_additional_cost || ''}
                onChange={(e) => setFormData({ ...formData, tiered_additional_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 15.00"
              />
            </div>
          )}
        </div>

        <ModalFooter className="mt-6">
          <button type="button" onClick={onDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors" title="Delete class">
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
  )
}

interface CreateClassModalProps {
  studios: Studio[]
  onClose: () => void
  onSubmit: (data: CreateClassData & { newStudioName?: string }) => void
}

function CreateClassModal({ studios, onClose, onSubmit }: CreateClassModalProps) {
  const { profile } = useUser()
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([])

  const [formData, setFormData] = useState<CreateClassData & { newStudioName?: string; instructor_id?: string }>({
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
    newStudioName: '',
    instructor_id: undefined
  })
  const [isCreatingNewStudio, setIsCreatingNewStudio] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(60) // Default 1 hour

  // Recurring class state
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([]) // 0=Sunday, 1=Monday, etc.
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingClassDates, setPendingClassDates] = useState<Date[]>([])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate recurring class dates
  const calculateRecurringDates = (): Date[] => {
    if (!formData.start_time || !recurringEndDate || selectedDays.length === 0) {
      return []
    }

    const dates: Date[] = []
    const startDate = new Date(formData.start_time)
    const endDate = new Date(recurringEndDate)
    endDate.setHours(23, 59, 59, 999) // Include the entire end date

    // Get time components from start_time
    const hours = startDate.getHours()
    const minutes = startDate.getMinutes()

    // Start from the day after the first class (first class is always included)
    dates.push(new Date(startDate))

    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + 1) // Move to next day

    while (currentDate <= endDate) {
      if (selectedDays.includes(currentDate.getDay())) {
        const classDate = new Date(currentDate)
        classDate.setHours(hours, minutes, 0, 0)
        dates.push(classDate)
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
  }

  const recurringDates = isRecurring ? calculateRecurringDates() : []

  // Fetch instructors for admin users
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchInstructors()
    }
  }, [profile])

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/profiles?role=instructor')
      if (!response.ok) throw new Error('Failed to fetch instructors')
      const data = await response.json()
      setInstructors(data.profiles || [])
    } catch (error) {
      console.error('Error fetching instructors:', error)
    }
  }

  // Helper function to format duration for display
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}min`
    if (mins === 0) return `${hours}hr`
    return `${hours}hr ${mins}min`
  }

  // Round datetime to nearest 5-minute interval (Eastern Time)
  const roundToNearestFiveMinutes = (dateTimeString: string): string => {
    if (!dateTimeString) return dateTimeString
    // dateTimeString is in datetime-local format (Eastern Time)
    const [datePart, timePart] = dateTimeString.split('T')
    const [hours, minutes] = timePart.split(':')
    const minuteNum = parseInt(minutes)
    const roundedMinutes = Math.round(minuteNum / 5) * 5
    const newMinutes = String(roundedMinutes % 60).padStart(2, '0')
    const newHours = String(Math.floor(roundedMinutes / 60) + parseInt(hours)).padStart(2, '0')
    return `${datePart}T${newHours}:${newMinutes}`
  }

  // Generate duration options in 5-minute increments
  const durationOptions = [
    15, 20, 25, 30, 35, 40, 45, 50, 55, 60, // up to 1 hour
    75, 90, 105, 120, // 1.25hr, 1.5hr, 1.75hr, 2hr
    150, 180, 210, 240 // 2.5hr, 3hr, 3.5hr, 4hr
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time || !durationMinutes) {
      return
    }

    // Convert ET times to UTC
    const startUTC = convertETToUTC(formData.start_time)
    const startDate = new Date(startUTC)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    const endUTC = endDate.toISOString()

    // For recurring classes, validate and check count
    if (isRecurring) {
      if (selectedDays.length === 0) {
        return // Need at least one day selected
      }
      if (!recurringEndDate) {
        return // Need an end date
      }

      const dates = calculateRecurringDates()
      if (dates.length === 0) {
        return
      }

      // Show confirmation dialog if more than 20 classes
      if (dates.length > 20) {
        setPendingClassDates(dates)
        setShowConfirmDialog(true)
        return
      }

      // Proceed with creating multiple classes
      submitRecurringClasses(dates, startUTC, endUTC)
      return
    }

    // Submit with UTC times
    onSubmit({
      ...formData,
      start_time: startUTC,
      end_time: endUTC
    })
  }

  const submitRecurringClasses = (dates: Date[], startUTC: string, endUTC: string) => {
    // Submit each class individually by calling onSubmit multiple times
    // The parent component will handle the actual API calls
    const classesToCreate = dates.map(date => {
      const startDate = new Date(date)
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
      return {
        ...formData,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString()
      }
    })

    // Pass all classes to parent via a special property
    onSubmit({
      ...formData,
      start_time: startUTC,
      end_time: endUTC,
      recurringClasses: classesToCreate
    } as any)
  }

  const handleConfirmRecurring = () => {
    setShowConfirmDialog(false)
    const startUTC = convertETToUTC(formData.start_time)
    const startDate = new Date(startUTC)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    const endUTC = endDate.toISOString()
    submitRecurringClasses(pendingClassDates, startUTC, endUTC)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Class" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Class Title *"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          {/* Instructor selection - only for admins */}
          {profile?.role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor (leave blank to use yourself)
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={formData.instructor_id || ''}
                onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
              >
                <option value="">Use me as the instructor</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Textarea
            label="Description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Studio
            </label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="studioOption"
                  checked={!isCreatingNewStudio}
                  onChange={() => {
                    setIsCreatingNewStudio(false)
                    setFormData({ ...formData, newStudioName: '' })
                  }}
                  className="mr-2 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700">Select existing</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="studioOption"
                  checked={isCreatingNewStudio}
                  onChange={() => {
                    setIsCreatingNewStudio(true)
                    setFormData({ ...formData, studio_id: '' })
                  }}
                  className="mr-2 text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700">Create new</span>
              </label>
            </div>

            {isCreatingNewStudio ? (
              <Input
                placeholder="Enter new studio name"
                value={formData.newStudioName || ''}
                onChange={(e) => setFormData({ ...formData, newStudioName: e.target.value })}
              />
            ) : (
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={formData.studio_id}
                onChange={(e) => setFormData({ ...formData, studio_id: e.target.value })}
              >
                <option value="">Select a studio</option>
                {studios.map(studio => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Class Type *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.class_type}
              onChange={(e) => setFormData({ ...formData, class_type: e.target.value as ClassType })}
            >
              <option value="group">Group</option>
              <option value="private">Private</option>
              <option value="workshop">Workshop</option>
              <option value="master_class">Master Class</option>
            </select>
          </div>

          <GooglePlacesInput
            label="Location"
            value={formData.location || ''}
            onChange={(value) => setFormData({ ...formData, location: value })}
            placeholder="Search for class location..."
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Time (ET) *"
              type="datetime-local"
              step="300"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Length *
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
              >
                {durationOptions.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Max Capacity"
            type="number"
            min="1"
            value={formData.max_capacity || ''}
            onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value ? parseInt(e.target.value) : undefined })}
          />

          <Input
            label="External Sign-up Link"
            type="url"
            placeholder="https://eventbrite.com/..."
            value={formData.external_signup_url || ''}
            onChange={(e) => setFormData({ ...formData, external_signup_url: e.target.value })}
          />
          <p className="text-xs text-gray-600 -mt-2 mb-2">
            Optional: Add a URL for classes booked through external platforms (e.g., Eventbrite)
          </p>

          {/* Recurring Class Options */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
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
                className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="recurring_toggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                Make this a recurring class
              </label>
            </div>

            {isRecurring && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repeat on these days *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (selectedDays.includes(index)) {
                            setSelectedDays(selectedDays.filter(d => d !== index))
                          } else {
                            setSelectedDays([...selectedDays, index])
                          }
                        }}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          selectedDays.includes(index)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Repeat until (end date) *"
                  type="date"
                  required={isRecurring}
                  value={recurringEndDate}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                  min={formData.start_time ? formData.start_time.split('T')[0] : undefined}
                />

                {recurringDates.length > 0 && (
                  <div className="text-sm text-purple-700 bg-purple-100 px-3 py-2 rounded">
                    This will create <strong>{recurringDates.length}</strong> classes
                    {recurringDates.length > 20 && (
                      <span className="text-purple-800"> (confirmation required)</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <input
              type="checkbox"
              id="create_is_public"
              checked={formData.is_public || false}
              onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              className="w-4 h-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
            />
            <label htmlFor="create_is_public" className="text-sm font-medium text-gray-700 cursor-pointer">
              Make class public for dancers and guardians to view and enroll
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pricing Model *
            </label>
            <select
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              value={formData.pricing_model || 'per_person'}
              onChange={(e) => setFormData({ ...formData, pricing_model: e.target.value as PricingModel })}
            >
              <option value="per_person">Per Person</option>
              <option value="per_class">Per Class (Flat Rate)</option>
              <option value="per_hour">Per Hour</option>
              <option value="tiered">Tiered (Base + Additional)</option>
            </select>
          </div>

          {/* Conditional pricing fields based on selected model */}
          {formData.pricing_model === 'per_person' && (
            <Input
              label="Cost Per Person ($) *"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.cost_per_person || ''}
              onChange={(e) => setFormData({ ...formData, cost_per_person: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 25.00"
            />
          )}

          {formData.pricing_model === 'per_class' && (
            <Input
              label="Base Cost (Flat Rate) ($) *"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.base_cost || ''}
              onChange={(e) => setFormData({ ...formData, base_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 150.00"
            />
          )}

          {formData.pricing_model === 'per_hour' && (
            <Input
              label="Cost Per Hour ($) *"
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.cost_per_hour || ''}
              onChange={(e) => setFormData({ ...formData, cost_per_hour: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="e.g., 75.00"
            />
          )}

          {formData.pricing_model === 'tiered' && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Set a base cost for the first X students, then charge per additional student</p>
              <Input
                label="Base Cost ($) *"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.base_cost || ''}
                onChange={(e) => setFormData({ ...formData, base_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 100.00"
              />
              <Input
                label="Students Included in Base Cost *"
                type="number"
                min="1"
                required
                value={formData.tiered_base_students || ''}
                onChange={(e) => setFormData({ ...formData, tiered_base_students: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="e.g., 5"
              />
              <Input
                label="Cost Per Additional Student ($) *"
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.tiered_additional_cost || ''}
                onChange={(e) => setFormData({ ...formData, tiered_additional_cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="e.g., 15.00"
              />
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
            <p className="text-gray-700">
              You are about to create <strong className="text-purple-700">{pendingClassDates.length}</strong> classes.
            </p>
            <p className="text-sm text-gray-600">
              This will create individual classes for each scheduled date. Are you sure you want to proceed?
            </p>
            <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Scheduled dates:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {pendingClassDates.slice(0, 10).map((date, i) => (
                  <li key={i}>
                    {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    {' at '}
                    {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </li>
                ))}
                {pendingClassDates.length > 10 && (
                  <li className="text-gray-500 italic">...and {pendingClassDates.length - 10} more</li>
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
