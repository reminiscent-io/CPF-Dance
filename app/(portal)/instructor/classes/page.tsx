'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Badge, Modal, ModalFooter, Input, Textarea, useToast, Spinner, GooglePlacesInput, PlaceDetails } from '@/components/ui'
import { PlusIcon } from '@heroicons/react/24/outline'
import type { Class, Studio, CreateClassData, ClassType, PricingModel } from '@/lib/types'
import { getPricingModelDescription, formatPrice } from '@/lib/utils/pricing'
import { convertETToUTC, convertUTCToET } from '@/lib/utils/et-timezone'

function ClassesContent() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
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
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchClasses()
      fetchStudios()
    }
  }, [user?.id, filterStudio, filterType, upcomingOnly])

  // Check for class_id query parameter and open modal
  useEffect(() => {
    if (!searchParams) return

    const classId = searchParams.get('class_id')
    if (classId && classes.length > 0 && !showEditModal) {
      const classToShow = classes.find(c => c.id === classId)
      if (classToShow) {
        setSelectedClass(classToShow)
        setShowEditModal(true)
        // Clear the query parameter after opening modal
        router.replace('/instructor/classes', { scroll: false })
      }
    }
  }, [searchParams, classes, showEditModal, router])

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
          <Button onClick={() => setShowCreateModal(true)} aria-label="Create Class">
            <PlusIcon className="w-5 h-5" />
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
              className={`cursor-pointer ${cls.class_type === 'private' ? '!bg-purple-50 !border-2 !border-purple-400' : ''}`}
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
  const { addToast } = useToast()
  const [instructors, setInstructors] = useState<{ id: string; full_name: string }[]>([])
  const [students, setStudents] = useState<{ id: string; full_name: string; email: string }[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; full_name: string }[]>([])

  // Recurring copy state
  const [showRecurringSection, setShowRecurringSection] = useState(false)
  const [recurringSelectedDays, setRecurringSelectedDays] = useState<number[]>([])
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [isCreatingRecurring, setIsCreatingRecurring] = useState(false)

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

  // Fetch instructors for admin users, students for all, and enrolled students
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchInstructors()
    }
    fetchStudents()
    if (classData.class_type === 'private') {
      fetchEnrolledStudents()
    }
  }, [profile, classData.id])

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

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students')
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchEnrolledStudents = async () => {
    try {
      const response = await fetch(`/api/classes/${classData.id}/enrollments`)
      if (!response.ok) throw new Error('Failed to fetch enrollments')
      const result = await response.json()
      setEnrolledStudents(result.enrollments || [])
    } catch (error) {
      console.error('Error fetching enrollments:', error)
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

  // Calculate recurring dates for copies
  const calculateRecurringCopyDates = (): string[] => {
    if (!formData.start_time || !recurringEndDate || recurringSelectedDays.length === 0) {
      return []
    }

    const dates: string[] = []

    // Parse the datetime-local format
    const [datePart, timePart] = formData.start_time.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)

    // Parse end date
    const [endYear, endMonth, endDay] = recurringEndDate.split('-').map(Number)

    // Create start date for iteration
    let currentYear = year
    let currentMonth = month
    let currentDay = day

    const getDayOfWeek = (y: number, m: number, d: number): number => {
      const date = new Date(y, m - 1, d)
      return date.getDay()
    }

    const isBeforeOrEqual = (y1: number, m1: number, d1: number, y2: number, m2: number, d2: number): boolean => {
      if (y1 < y2) return true
      if (y1 > y2) return false
      if (m1 < m2) return true
      if (m1 > m2) return false
      return d1 <= d2
    }

    const daysInMonth = (y: number, m: number): number => {
      return new Date(y, m, 0).getDate()
    }

    const advanceDay = (y: number, m: number, d: number): [number, number, number] => {
      d++
      if (d > daysInMonth(y, m)) {
        d = 1
        m++
        if (m > 12) {
          m = 1
          y++
        }
      }
      return [y, m, d]
    }

    const formatDateTimeLocal = (y: number, m: number, d: number, h: number, min: number): string => {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    }

    // Start from the next day (don't include the original class)
    ;[currentYear, currentMonth, currentDay] = advanceDay(currentYear, currentMonth, currentDay)

    while (isBeforeOrEqual(currentYear, currentMonth, currentDay, endYear, endMonth, endDay)) {
      if (recurringSelectedDays.includes(getDayOfWeek(currentYear, currentMonth, currentDay))) {
        dates.push(formatDateTimeLocal(currentYear, currentMonth, currentDay, hours, minutes))
      }
      ;[currentYear, currentMonth, currentDay] = advanceDay(currentYear, currentMonth, currentDay)
    }

    return dates
  }

  const recurringCopyDates = showRecurringSection ? calculateRecurringCopyDates() : []

  // Handle creating recurring copies
  const handleCreateRecurringCopies = async () => {
    if (recurringCopyDates.length === 0) {
      addToast('Please select days and an end date', 'error')
      return
    }

    setIsCreatingRecurring(true)

    try {
      const classesToCreate = recurringCopyDates.map(dateStr => {
        const startUTC = convertETToUTC(dateStr)
        const startDate = new Date(startUTC)
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
        return {
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
          instructor_id: formData.instructor_id,
          start_time: startUTC,
          end_time: endDate.toISOString()
        }
      })

      const response = await fetch('/api/classes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: classesToCreate })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create recurring classes')
      }

      const { classes: newClasses } = await response.json()
      addToast(`${newClasses.length} recurring classes created successfully`, 'success')
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time || !durationMinutes) {
      return
    }

    // Calculate end_time from start_time + duration
    // Use convertETToUTC to get proper UTC time, then add duration
    const startUTC = convertETToUTC(formData.start_time)
    const startDate = new Date(startUTC)
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)

    // Submit with UTC times
    onSubmit({
      ...formData,
      start_time: startUTC,
      end_time: endDate.toISOString()
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
            rows={2}
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

          {/* Student enrollment management for private lessons */}
          {formData.class_type === 'private' && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Enrolled Students
              </label>

              {enrolledStudents.length > 0 ? (
                <div className="space-y-2">
                  {enrolledStudents.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border border-purple-200">
                      <span className="text-sm font-medium text-gray-900">{student.full_name}</span>
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
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No students enrolled yet</p>
              )}

              <div className="pt-2 border-t border-purple-200">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Add Student
                </label>
                <select
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                          await fetchEnrolledStudents()
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
                        {student.full_name} {student.email && `(${student.email})`}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

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

          {/* Create Recurring Copies Section */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Create Recurring Copies</h4>
                <p className="text-xs text-gray-600">Generate additional classes based on this one</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Create copies on these days *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (recurringSelectedDays.includes(index)) {
                            setRecurringSelectedDays(recurringSelectedDays.filter(d => d !== index))
                          } else {
                            setRecurringSelectedDays([...recurringSelectedDays, index])
                          }
                        }}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                          recurringSelectedDays.includes(index)
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
                  label="Create copies until (end date) *"
                  type="date"
                  value={recurringEndDate}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                  min={formData.start_time ? formData.start_time.split('T')[0] : undefined}
                />

                {recurringCopyDates.length > 0 && (
                  <div className="text-sm text-purple-700 bg-purple-100 px-3 py-2 rounded">
                    This will create <strong>{recurringCopyDates.length}</strong> additional classes
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleCreateRecurringCopies}
                  disabled={isCreatingRecurring || recurringCopyDates.length === 0}
                  className="w-full"
                >
                  {isCreatingRecurring ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    `Create ${recurringCopyDates.length} Recurring Classes`
                  )}
                </Button>
              </>
            )}
          </div>
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
  const [students, setStudents] = useState<{ id: string; full_name: string; email: string }[]>([])

  const [formData, setFormData] = useState<CreateClassData & { newStudioName?: string; instructor_id?: string; student_id?: string }>({
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
    instructor_id: undefined,
    student_id: undefined
  })
  const [isCreatingNewStudio, setIsCreatingNewStudio] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(60) // Default 1 hour

  // Recurring class state
  const [isRecurring, setIsRecurring] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([]) // 0=Sunday, 1=Monday, etc.
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingClassDates, setPendingClassDates] = useState<string[]>([])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Calculate recurring class dates - returns date strings in ET datetime-local format
  const calculateRecurringDates = (): string[] => {
    if (!formData.start_time || !recurringEndDate || selectedDays.length === 0) {
      return []
    }

    const dates: string[] = []

    // Parse the datetime-local format (e.g., "2024-12-15T14:00")
    const [datePart, timePart] = formData.start_time.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)

    // Parse the end date
    const [endYear, endMonth, endDay] = recurringEndDate.split('-').map(Number)

    // Create start date for iteration (using simple date components)
    let currentYear = year
    let currentMonth = month
    let currentDay = day

    // Helper to get day of week (0=Sunday) from date components
    const getDayOfWeek = (y: number, m: number, d: number): number => {
      const date = new Date(y, m - 1, d)
      return date.getDay()
    }

    // Helper to check if date1 <= date2
    const isBeforeOrEqual = (y1: number, m1: number, d1: number, y2: number, m2: number, d2: number): boolean => {
      if (y1 < y2) return true
      if (y1 > y2) return false
      if (m1 < m2) return true
      if (m1 > m2) return false
      return d1 <= d2
    }

    // Helper to get days in month
    const daysInMonth = (y: number, m: number): number => {
      return new Date(y, m, 0).getDate()
    }

    // Helper to advance date by one day
    const advanceDay = (y: number, m: number, d: number): [number, number, number] => {
      d++
      if (d > daysInMonth(y, m)) {
        d = 1
        m++
        if (m > 12) {
          m = 1
          y++
        }
      }
      return [y, m, d]
    }

    // Helper to format date as datetime-local string
    const formatDateTimeLocal = (y: number, m: number, d: number, h: number, min: number): string => {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    }

    // Always include the first class
    dates.push(formData.start_time)

    // Move to next day and iterate
    ;[currentYear, currentMonth, currentDay] = advanceDay(currentYear, currentMonth, currentDay)

    while (isBeforeOrEqual(currentYear, currentMonth, currentDay, endYear, endMonth, endDay)) {
      if (selectedDays.includes(getDayOfWeek(currentYear, currentMonth, currentDay))) {
        dates.push(formatDateTimeLocal(currentYear, currentMonth, currentDay, hours, minutes))
      }
      ;[currentYear, currentMonth, currentDay] = advanceDay(currentYear, currentMonth, currentDay)
    }

    return dates
  }

  const recurringDates = isRecurring ? calculateRecurringDates() : []

  // Fetch instructors for admin users and students for all users
  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchInstructors()
    }
    fetchStudents()
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

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students')
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error('Error fetching students:', error)
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

      const dateStrings = calculateRecurringDates()
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
      start_time: startUTC,
      end_time: endUTC
    })
  }

  const submitRecurringClasses = (dateStrings: string[]) => {
    // Each dateString is in ET datetime-local format (e.g., "2024-12-15T14:00")
    // Convert each to UTC and create class data
    const classesToCreate = dateStrings.map(dateStr => {
      const startUTC = convertETToUTC(dateStr)
      const startDate = new Date(startUTC)
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
      return {
        ...formData,
        start_time: startUTC,
        end_time: endDate.toISOString()
      }
    })

    // Use the first class times for the main submission
    const firstStartUTC = convertETToUTC(dateStrings[0])
    const firstStartDate = new Date(firstStartUTC)
    const firstEndDate = new Date(firstStartDate.getTime() + durationMinutes * 60000)

    // Pass all classes to parent via a special property
    onSubmit({
      ...formData,
      start_time: firstStartUTC,
      end_time: firstEndDate.toISOString(),
      recurringClasses: classesToCreate
    } as any)
  }

  const handleConfirmRecurring = () => {
    setShowConfirmDialog(false)
    submitRecurringClasses(pendingClassDates)
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
            rows={2}
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

          {/* Student selection for private lessons */}
          {formData.class_type === 'private' && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student (Optional)
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={formData.student_id || ''}
                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              >
                <option value="">Select a student</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} {student.email && `(${student.email})`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-purple-700 mt-2">
                Select a student to automatically enroll them in this private lesson
              </p>
            </div>
          )}

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
              <p className="text-xs text-gray-500 mb-2">Scheduled dates (Eastern Time):</p>
              <ul className="text-sm text-gray-700 space-y-1">
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

export default function ClassesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    }>
      <ClassesContent />
    </Suspense>
  )
}
