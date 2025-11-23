'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal, ModalFooter } from '@/components/ui/Modal'

interface ClassData {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  enrollment_id: string
  enrolled_at: string
  attendance_status: string | null
  enrollment_notes: string | null
  instructor_name: string
  studio: {
    name: string
    address: string | null
    city: string | null
    state: string | null
  } | null
  source: 'enrolled'
}

interface PersonalClass {
  id: string
  title: string
  instructor_name: string | null
  location: string | null
  start_time: string
  end_time: string | null
  notes: string | null
  is_recurring: boolean
  created_at: string
  updated_at: string
  source: 'personal'
}

type CombinedClass = ClassData | PersonalClass

type FilterType = 'all' | 'upcoming' | 'past'

export default function DancerClassesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [enrolledClasses, setEnrolledClasses] = useState<ClassData[]>([])
  const [personalClasses, setPersonalClasses] = useState<PersonalClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [filter, setFilter] = useState<FilterType>('upcoming')
  const [showModal, setShowModal] = useState(false)
  const [editingClass, setEditingClass] = useState<PersonalClass | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    instructor_name: '',
    location: '',
    start_time: '',
    end_time: '',
    notes: '',
    is_recurring: false
  })
  const [saving, setSaving] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(60) // Default 1 hour
  const [recurringDays, setRecurringDays] = useState<number[]>([]) // 0=Sun, 1=Mon, etc
  const [recurringEndDate, setRecurringEndDate] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [tentativeClasses, setTentativeClasses] = useState<Array<{ start_time: string; end_time: string }>>([])
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchClasses()
    }
  }, [loading, user, profile])

  const fetchClasses = async () => {
    try {
      const [enrolledResponse, personalResponse] = await Promise.all([
        fetch('/api/dancer/classes'),
        fetch('/api/dancer/personal-classes')
      ])

      if (enrolledResponse.ok) {
        const data = await enrolledResponse.json()
        setEnrolledClasses(data.classes.map((c: any) => ({ ...c, source: 'enrolled' as const })))
      }

      if (personalResponse.ok) {
        const data = await personalResponse.json()
        setPersonalClasses(data.classes.map((c: any) => ({ ...c, source: 'personal' as const })))
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleOpenModal = (personalClass?: PersonalClass) => {
    if (personalClass) {
      setEditingClass(personalClass)
      const startDate = new Date(personalClass.start_time)
      let duration = 60 // Default 1 hour
      if (personalClass.end_time) {
        const endDate = new Date(personalClass.end_time)
        duration = Math.round((endDate.getTime() - startDate.getTime()) / 60000) // Convert to minutes
      }
      setDurationMinutes(duration)
      setFormData({
        title: personalClass.title,
        instructor_name: personalClass.instructor_name || '',
        location: personalClass.location || '',
        start_time: startDate.toISOString().slice(0, 16),
        end_time: personalClass.end_time ? new Date(personalClass.end_time).toISOString().slice(0, 16) : '',
        notes: personalClass.notes || '',
        is_recurring: personalClass.is_recurring
      })
    } else {
      setEditingClass(null)
      setDurationMinutes(60)
      setFormData({
        title: '',
        instructor_name: '',
        location: '',
        start_time: '',
        end_time: '',
        notes: '',
        is_recurring: false
      })
    }
    setRecurringDays([])
    setRecurringEndDate('')
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingClass(null)
    setDurationMinutes(60)
    setRecurringDays([])
    setRecurringEndDate('')
    setShowConfirmation(false)
    setTentativeClasses([])
    setFormData({
      title: '',
      instructor_name: '',
      location: '',
      start_time: '',
      end_time: '',
      notes: '',
      is_recurring: false
    })
  }

  const generateRecurringInstances = (startTime: string, duration: number, days: number[], endDate: string) => {
    const instances: Array<{ start_time: string; end_time: string }> = []
    const start = new Date(startTime)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    // Start from the first matching day
    const currentDate = new Date(start)
    const dayOfWeek = currentDate.getDay()
    const daysToAdd = days.length > 0 ? Math.min(...days.map(d => (d - dayOfWeek + 7) % 7 || 7)) : 0

    if (daysToAdd > 0) {
      currentDate.setDate(currentDate.getDate() + daysToAdd)
    }

    // Generate all instances
    while (currentDate <= end) {
      if (days.includes(currentDate.getDay())) {
        const instanceStart = new Date(currentDate)
        instanceStart.setHours(start.getHours(), start.getMinutes(), 0, 0)

        const instanceEnd = new Date(instanceStart.getTime() + duration * 60000)

        instances.push({
          start_time: instanceStart.toISOString(),
          end_time: instanceEnd.toISOString()
        })
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return instances
  }

  const handleSaveClick = async () => {
    if (!formData.title.trim() || !formData.start_time || !durationMinutes) {
      alert('Please enter a title, start time, and duration')
      return
    }

    if (formData.is_recurring) {
      if (recurringDays.length === 0) {
        alert('Please select at least one day of the week')
        return
      }
      if (!recurringEndDate) {
        alert('Please select an end date for recurring classes')
        return
      }

      // Generate instances and check if > 20
      const instances = generateRecurringInstances(formData.start_time, durationMinutes, recurringDays, recurringEndDate)

      if (instances.length > 20) {
        setTentativeClasses(instances)
        setShowConfirmation(true)
        return
      }

      // Otherwise proceed with creation
      await createRecurringClasses(instances)
    } else {
      // Single class - proceed normally
      await createSingleClass()
    }
  }

  const createSingleClass = async () => {
    setSaving(true)
    try {
      const startDate = new Date(formData.start_time)
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
      const endTimeISO = endDate.toISOString()

      const payload = {
        ...formData,
        title: formData.title.trim(),
        instructor_name: formData.instructor_name.trim() || null,
        location: formData.location.trim() || null,
        start_time: startDate.toISOString(),
        end_time: endTimeISO,
        notes: formData.notes.trim() || null,
        is_recurring: false
      }

      const url = '/api/dancer/personal-classes'
      const method = editingClass ? 'PUT' : 'POST'
      const body = editingClass ? { ...payload, id: editingClass.id } : payload

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await fetchClasses()
        handleCloseModal()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save class')
      }
    } catch (error) {
      console.error('Error saving class:', error)
      alert('Failed to save class')
    } finally {
      setSaving(false)
    }
  }

  const createRecurringClasses = async (instances: Array<{ start_time: string; end_time: string }>) => {
    setSaving(true)
    try {
      const requests = instances.map(instance =>
        fetch('/api/dancer/personal-classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title.trim(),
            instructor_name: formData.instructor_name.trim() || null,
            location: formData.location.trim() || null,
            start_time: instance.start_time,
            end_time: instance.end_time,
            notes: formData.notes.trim() || null,
            is_recurring: false
          })
        })
      )

      const responses = await Promise.all(requests)
      const allSuccessful = responses.every(r => r.ok)

      if (allSuccessful) {
        await fetchClasses()
        handleCloseModal()
        alert(`Successfully created ${instances.length} classes`)
      } else {
        alert('Some classes failed to create. Please try again.')
      }
    } catch (error) {
      console.error('Error creating recurring classes:', error)
      alert('Failed to create recurring classes')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) {
      return
    }

    try {
      const response = await fetch(`/api/dancer/personal-classes?id=${classId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchClasses()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete class')
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Failed to delete class')
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

  // Generate duration options in 5-minute increments
  const durationOptions = [
    15, 20, 25, 30, 35, 40, 45, 50, 55, 60, // up to 1 hour
    75, 90, 105, 120, // 1.25hr, 1.5hr, 1.75hr, 2hr
    150, 180, 210, 240 // 2.5hr, 3hr, 3.5hr, 4hr
  ]

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

  const now = new Date()

  // Combine both enrolled and personal classes
  const allClasses: CombinedClass[] = [
    ...enrolledClasses,
    ...personalClasses
  ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const filteredClasses = allClasses.filter((cls) => {
    const classDate = new Date(cls.start_time)
    if (filter === 'upcoming') {
      if (cls.source === 'enrolled') {
        return classDate >= now && !(cls as ClassData).is_cancelled
      }
      return classDate >= now
    }
    if (filter === 'past') return classDate < now
    return true
  })

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getClassTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      group: 'bg-blue-100 text-blue-800',
      private: 'bg-purple-100 text-purple-800',
      workshop: 'bg-green-100 text-green-800',
      master_class: 'bg-rose-100 text-rose-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getAttendanceColor = (status: string | null) => {
    const colors: Record<string, string> = {
      present: 'success',
      absent: 'danger',
      late: 'warning',
      excused: 'secondary'
    }
    return (status && colors[status]) || 'default'
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Classes</h1>
          <p className="text-gray-600">Track all your dance classes in one place</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          + Add Class
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filter === 'upcoming' ? 'primary' : 'outline'}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'past' ? 'primary' : 'outline'}
          onClick={() => setFilter('past')}
        >
          Past
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {loadingClasses ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const { date, time } = formatDateTime(cls.start_time)
            const isPast = new Date(cls.start_time) < now
            const isPersonal = cls.source === 'personal'
            const personalCls = isPersonal ? (cls as PersonalClass) : null
            const enrolledCls = !isPersonal ? (cls as ClassData) : null

            return (
              <Card key={cls.id} hover className="flex flex-col">
                <CardContent className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {cls.title}
                        </h3>
                        <Badge variant={isPersonal ? 'secondary' : 'primary'} size="sm">
                          {isPersonal ? 'Personal' : 'Enrolled'}
                        </Badge>
                      </div>
                      {enrolledCls && (
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getClassTypeColor(
                            enrolledCls.class_type
                          )}`}
                        >
                          {enrolledCls.class_type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    {enrolledCls?.is_cancelled && (
                      <Badge variant="danger" size="sm">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  {enrolledCls?.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {enrolledCls.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📅</span>
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">⏰</span>
                      <span>{time}</span>
                    </div>
                    {cls.location && (
                      <div className="flex items-center text-gray-700">
                        <span className="mr-2">📍</span>
                        <span>
                          {isPersonal ? cls.location : (enrolledCls?.studio?.name || cls.location)}
                          {enrolledCls?.studio?.city && `, ${enrolledCls.studio.city}`}
                        </span>
                      </div>
                    )}
                    {(isPersonal ? personalCls?.instructor_name : enrolledCls?.instructor_name) && (
                      <div className="flex items-center text-gray-700">
                        <span className="mr-2">👤</span>
                        <span>{isPersonal ? personalCls?.instructor_name : enrolledCls?.instructor_name}</span>
                      </div>
                    )}
                  </div>

                  {enrolledCls && isPast && enrolledCls.attendance_status && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Attendance:</span>
                        <Badge
                          variant={getAttendanceColor(enrolledCls.attendance_status) as any}
                          size="sm"
                        >
                          {enrolledCls.attendance_status}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {enrolledCls?.enrollment_notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        &ldquo;{enrolledCls.enrollment_notes}&rdquo;
                      </p>
                    </div>
                  )}

                  {personalCls?.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 italic">
                        &ldquo;{personalCls.notes}&rdquo;
                      </p>
                    </div>
                  )}

                  {isPersonal && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenModal(personalCls!)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(cls.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🩰</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'upcoming' && 'No Upcoming Classes'}
              {filter === 'past' && 'No Past Classes'}
              {filter === 'all' && 'No Classes Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'upcoming' &&
                "You don&apos;t have any upcoming classes scheduled right now."}
              {filter === 'past' && "You haven&apos;t attended any classes yet."}
              {filter === 'all' &&
                "You&apos;re not enrolled in any classes yet. Talk to your instructor to get started!"}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View All Classes
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingClass ? 'Edit Class' : 'Add New Class'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Class Title"
            placeholder="e.g., Ballet Class, Hip Hop Workshop..."
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <Input
            label="Instructor Name (optional)"
            placeholder="e.g., Sarah Johnson"
            value={formData.instructor_name}
            onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
          />
          <Input
            label="Location (optional)"
            placeholder="e.g., Dance Studio A, 123 Main St"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date & Time *"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration *
              </label>
              <select
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {durationOptions.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Textarea
            label="Notes (optional)"
            placeholder="Add any notes about this class..."
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_recurring"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
            />
            <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">
              This is a recurring class
            </label>
          </div>

          {formData.is_recurring && (
            <>
              <div className="border-t border-gray-200 pt-4"></div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Days of Week *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {daysOfWeek.map((day, index) => (
                    <label key={index} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recurringDays.includes(index)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRecurringDays([...recurringDays, index].sort((a, b) => a - b))
                          } else {
                            setRecurringDays(recurringDays.filter(d => d !== index))
                          }
                        }}
                        className="mr-2 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-sm text-gray-700">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={recurringEndDate}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            </>
          )}
        </div>

        <ModalFooter className="mt-6">
          <Button variant="outline" onClick={handleCloseModal} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSaveClick} disabled={saving}>
            {saving ? 'Saving...' : editingClass ? 'Update Class' : 'Add Class'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirmation Dialog for Large Batch */}
      <Modal
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false)
          setTentativeClasses([])
        }}
        title="Confirm Recurring Classes"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            You are about to create <strong className="text-rose-600">{tentativeClasses.length} classes</strong>.
          </p>
          <p className="text-sm text-gray-600">
            This is a large batch. Please confirm you want to proceed with creating all these classes.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto">
            <p className="text-sm font-semibold text-gray-700 mb-2">Class Instances:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {tentativeClasses.slice(0, 10).map((cls, idx) => (
                <li key={idx}>
                  {new Date(cls.start_time).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </li>
              ))}
              {tentativeClasses.length > 10 && (
                <li className="font-semibold text-gray-700 mt-2">
                  ... and {tentativeClasses.length - 10} more
                </li>
              )}
            </ul>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowConfirmation(false)
              setTentativeClasses([])
            }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setShowConfirmation(false)
              await createRecurringClasses(tentativeClasses)
              setTentativeClasses([])
            }}
            disabled={saving}
          >
            {saving ? 'Creating...' : `Create ${tentativeClasses.length} Classes`}
          </Button>
        </ModalFooter>
      </Modal>
    </PortalLayout>
  )
}
