'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, Button, Badge, Spinner, useToast, Modal, ModalFooter, Input, Textarea, GooglePlacesInput } from '@/components/ui'
import type { Studio, ClassType } from '@/lib/types'
import { convertETToUTC } from '@/lib/utils/et-timezone'

interface PrivateLessonRequest {
  id: string
  student_id: string
  instructor_id: string
  requested_focus: string
  preferred_dates: string[]
  additional_notes: string | null
  status: string
  created_at: string
  student: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    profile: {
      full_name: string | null
      email: string | null
      phone: string | null
    } | null
  }
}

export default function InstructorRequestsPage() {
  const { user, profile, loading } = useUser()
  const { addToast } = useToast()
  const [requests, setRequests] = useState<PrivateLessonRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  // Create Class Modal state
  const [showCreateClassModal, setShowCreateClassModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PrivateLessonRequest | null>(null)
  const [studios, setStudios] = useState<Studio[]>([])

  useEffect(() => {
    if (!loading && profile && (profile.role === 'instructor' || profile.role === 'admin')) {
      fetchRequests()
      fetchStudios()
    }
  }, [loading, profile])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/instructor/requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
      } else {
        addToast('Failed to load requests', 'error')
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
      addToast('An error occurred while loading requests', 'error')
    } finally {
      setLoadingRequests(false)
    }
  }

  const fetchStudios = async () => {
    try {
      const response = await fetch('/api/studios?is_active=true')
      if (response.ok) {
        const data = await response.json()
        setStudios(data.studios || [])
      }
    } catch (err) {
      console.error('Error fetching studios:', err)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const response = await fetch('/api/instructor/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      })

      if (response.ok) {
        setRequests(prev => prev.map(req => 
          req.id === id ? { ...req, status: newStatus } : req
        ))
        addToast(`Request ${newStatus}`, 'success')
      } else {
        addToast('Failed to update request', 'error')
      }
    } catch (err) {
      console.error('Error updating request:', err)
      addToast('An error occurred', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleClassCreated = async () => {
    handleCloseCreateClassModal()
    await fetchRequests()
    addToast('Private lesson scheduled', 'success')
  }

  const handleOpenCreateClassModal = (request: PrivateLessonRequest) => {
    setSelectedRequest(request)
    setShowCreateClassModal(true)
  }

  const handleCloseCreateClassModal = () => {
    setShowCreateClassModal(false)
    setSelectedRequest(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'approved':
        return <Badge variant="success">Approved</Badge>
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>
      case 'scheduled':
        return <Badge variant="primary">Scheduled</Badge>
      case 'declined':
        return <Badge variant="default">Declined</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      default:
        return <Badge variant="default">{status}</Badge>
    }
  }

  const getStudentName = (request: PrivateLessonRequest) => {
    return request.student?.full_name || 
           request.student?.profile?.full_name || 
           'Unknown Student'
  }

  const getStudentContact = (request: PrivateLessonRequest) => {
    const email = request.student?.email || request.student?.profile?.email
    const phone = request.student?.phone || request.student?.profile?.phone
    return { email, phone }
  }

  if (loading || loadingRequests) {
    return (
      <PortalLayout profile={profile}>
        <div className="min-h-screen flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </PortalLayout>
    )
  }

  if (!user || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return null
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const otherRequests = requests.filter(r => r.status !== 'pending')

  return (
    <PortalLayout profile={profile}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-charcoal-950 mb-2">Private Lesson Requests</h1>
          <p className="text-lg text-charcoal-800">
            Manage private lesson requests from your students
          </p>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-charcoal-600 mb-2">No requests yet</p>
              <p className="text-charcoal-500 text-sm">
                When students submit private lesson requests, they'll appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {pendingRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-charcoal-900 mb-4">
                  Pending Requests ({pendingRequests.length})
                </h2>
                <div className="grid gap-4">
                  {pendingRequests.map((request) => {
                    const contact = getStudentContact(request)
                    return (
                      <Card key={request.id} className="bg-gold-50 border border-gold-200">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <h3 className="text-lg font-semibold text-charcoal-950">
                                  {getStudentName(request)}
                                </h3>
                                {getStatusBadge(request.status)}
                              </div>
                              
                              <div className="space-y-2 text-sm text-charcoal-700">
                                <div>
                                  <span className="font-medium">Focus: </span>
                                  {request.requested_focus}
                                </div>
                                
                                {request.preferred_dates && request.preferred_dates.length > 0 && (
                                  <div>
                                    <span className="font-medium">Preferred Dates: </span>
                                    {request.preferred_dates.join(', ')}
                                  </div>
                                )}
                                
                                {request.additional_notes && (
                                  <div>
                                    <span className="font-medium">Notes: </span>
                                    {request.additional_notes}
                                  </div>
                                )}
                                
                                <div className="flex flex-wrap gap-4 pt-2 text-charcoal-600">
                                  {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="hover:text-rose-600">
                                      {contact.email}
                                    </a>
                                  )}
                                  {contact.phone && (
                                    <a href={`tel:${contact.phone}`} className="hover:text-rose-600">
                                      {contact.phone}
                                    </a>
                                  )}
                                </div>
                                
                                <div className="text-xs text-charcoal-500 pt-1">
                                  Submitted {new Date(request.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenCreateClassModal(request)}
                              >
                                Create Class
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatus(request.id, 'declined')}
                                disabled={updatingId === request.id}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {otherRequests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-charcoal-900 mb-4">
                  Previous Requests ({otherRequests.length})
                </h2>
                <div className="grid gap-4">
                  {otherRequests.map((request) => {
                    return (
                      <Card key={request.id} className="opacity-80">
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-charcoal-950">
                                  {getStudentName(request)}
                                </h3>
                                {getStatusBadge(request.status)}
                              </div>
                              
                              <div className="space-y-1 text-sm text-charcoal-600">
                                <div>
                                  <span className="font-medium">Focus: </span>
                                  {request.requested_focus}
                                </div>
                                
                                <div className="text-xs text-charcoal-500">
                                  Submitted {new Date(request.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCreateClassModal(request)}
                                className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                              >
                                Create Class
                              </Button>
                              {request.status !== 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatus(request.id, 'pending')}
                                  disabled={updatingId === request.id}
                                >
                                  Reopen
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateClassModal && selectedRequest && (
        <CreatePrivateLessonClassModal
          request={selectedRequest}
          studios={studios}
          onClose={handleCloseCreateClassModal}
          onSuccess={handleClassCreated}
        />
      )}
    </PortalLayout>
  )
}

interface CreatePrivateLessonClassModalProps {
  readonly request: PrivateLessonRequest
  readonly studios: Studio[]
  readonly onClose: () => void
  readonly onSuccess: () => void
}

interface BalanceSummary {
  remaining: number
  dayOfPrice: number | null
  nextPackName: string | null
}

const DURATION_OPTIONS = [
  15, 20, 25, 30, 35, 40, 45, 50, 55, 60,
  75, 90, 105, 120,
  150, 180, 210, 240
]

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}hr`
  return `${hours}hr ${mins}min`
}

function CreatePrivateLessonClassModal({ request, studios, onClose, onSuccess }: CreatePrivateLessonClassModalProps) {
  const { addToast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingNewStudio, setIsCreatingNewStudio] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [balance, setBalance] = useState<BalanceSummary | null>(null)

  const studentName = request.student?.full_name || request.student?.profile?.full_name || 'Student'

  const [formData, setFormData] = useState({
    title: `Private Lesson - ${studentName}`,
    description: request.requested_focus || '',
    studio_id: '',
    newStudioName: '',
    location: '',
    start_time: ''
  })

  useEffect(() => {
    let cancelled = false
    fetch(`/api/instructor/students/${request.student_id}/lesson-balance`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setBalance({
            remaining: data.remaining ?? 0,
            dayOfPrice: data.dayOfPrice ?? null,
            nextPackName: data.nextPackName ?? null
          })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [request.student_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.start_time) {
      addToast('Please fill in required fields', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      let studioId = formData.studio_id

      if (isCreatingNewStudio && formData.newStudioName?.trim()) {
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
      }

      const startUTC = convertETToUTC(formData.start_time)
      const startDate = new Date(startUTC)
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
      const endUTC = endDate.toISOString()

      const classData = {
        title: formData.title,
        description: formData.description,
        studio_id: studioId || null,
        location: formData.location,
        class_type: 'private' as ClassType,
        start_time: startUTC,
        end_time: endUTC,
        max_capacity: 1,
        is_public: false,
        student_id: request.student_id,
        private_lesson_request_id: request.id
      }

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create class')
      }

      onSuccess()
    } catch (error) {
      console.error('Error creating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class'
      addToast(errorMessage, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Private Lesson" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="primary">Private Lesson</Badge>
              <span className="text-sm font-medium text-purple-800">
                for {studentName}
              </span>
            </div>
            {request.requested_focus && (
              <p className="text-sm text-purple-700 mt-1">
                <span className="font-medium">Focus:</span> {request.requested_focus}
              </p>
            )}
          </div>

          <PaymentSummary balance={balance} />

          <Input
            label="Class Title *"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <Textarea
            label="Description"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Any additional notes about this lesson..."
          />

          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Studio
            </legend>
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
                <option value="">Select a studio (optional)</option>
                {studios.map(studio => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            )}
          </fieldset>

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
              <label htmlFor="duration-select" className="block text-sm font-medium text-gray-700 mb-1">
                Length *
              </label>
              <select
                id="duration-select"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number.parseInt(e.target.value, 10))}
              >
                {DURATION_OPTIONS.map(minutes => (
                  <option key={minutes} value={minutes}>
                    {formatDuration(minutes)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Private Lesson'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

function PaymentSummary({ balance }: { readonly balance: BalanceSummary | null }) {
  if (!balance) {
    return (
      <div className="p-3 bg-champagne-50 border border-champagne-200 rounded-lg">
        <p className="text-sm text-charcoal-500">Checking lesson balance…</p>
      </div>
    )
  }

  if (balance.remaining > 0) {
    const packLabel = balance.nextPackName ? ` from ${balance.nextPackName}` : ''
    return (
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <p className="text-sm text-emerald-900">
          <strong>1 credit will be used</strong>{packLabel} when you create the class. Dancer has {balance.remaining} {balance.remaining === 1 ? 'credit' : 'credits'} on file.
        </p>
      </div>
    )
  }

  const priceLabel = balance.dayOfPrice != null ? `$${balance.dayOfPrice.toFixed(2)}` : 'the single-lesson rate'
  return (
    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
      <p className="text-sm text-charcoal-900">
        <strong>No credits on file.</strong> Dancer will pay <span className="tabular-nums font-medium">{priceLabel}</span> day-of via Venmo or cash.
      </p>
    </div>
  )
}
