'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { LessonPackInfo } from '@/components/LessonPackInfo'

interface Instructor {
  id: string
  full_name: string | null
  email: string | null
}

interface LessonRequest {
  id: string
  requested_focus: string | null
  preferred_dates: string[] | null
  additional_notes: string | null
  status: string
  instructor_response: string | null
  instructor_id: string | null
  created_at: string
  updated_at: string
}

export default function RequestPrivateLessonPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [requests, setRequests] = useState<LessonRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loadingInstructors, setLoadingInstructors] = useState(true)
  const [formData, setFormData] = useState({
    requested_focus: '',
    preferred_dates: '',
    additional_notes: '',
    instructor_id: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [paymentCanceled, setPaymentCanceled] = useState(false)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchRequests()
      fetchInstructors()
    }
  }, [loading, user, profile])

  useEffect(() => {
    if (instructors.length > 0 && !formData.instructor_id) {
      const courtney = instructors.find(i => 
        i.full_name?.toLowerCase().includes('courtney') && 
        i.full_name?.toLowerCase().includes('file')
      )
      if (courtney) {
        setFormData(prev => ({ ...prev, instructor_id: courtney.id }))
      }
    }
  }, [instructors, formData.instructor_id])

  useEffect(() => {
    // Check for payment success/canceled in URL (client-side only)
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const canceled = params.get('canceled')

    if (success === 'true') {
      setPaymentSuccess(true)
      setPaymentCanceled(false)
      setSuccessMessage('Payment successful! Your lesson pack has been added to your account. 🎉')
      setTimeout(() => {
        setPaymentSuccess(false)
        setSuccessMessage('')
        // Clear URL parameters
        router.replace('/dancer/request-lesson')
      }, 5000)
    } else if (canceled === 'true') {
      setPaymentCanceled(true)
      setPaymentSuccess(false)
      setSuccessMessage('Payment was canceled. You can try again anytime.')
      setTimeout(() => {
        setPaymentCanceled(false)
        setSuccessMessage('')
        // Clear URL parameters
        router.replace('/dancer/request-lesson')
      }, 5000)
    }
  }, [router])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/dancer/lesson-requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoadingRequests(false)
    }
  }

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/dancer/instructors')
      if (response.ok) {
        const data = await response.json()
        setInstructors(data.instructors)
      }
    } catch (error) {
      console.error('Error fetching instructors:', error)
    } finally {
      setLoadingInstructors(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.requested_focus.trim()) {
      alert('Please describe what you would like to focus on')
      return
    }

    if (!formData.instructor_id) {
      alert('Please select an instructor')
      return
    }

    setSubmitting(true)
    try {
      const preferredDatesArray = formData.preferred_dates
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0)

      // Step 1: Create the lesson request
      const requestResponse = await fetch('/api/dancer/lesson-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_focus: formData.requested_focus.trim(),
          preferred_dates: preferredDatesArray,
          additional_notes: formData.additional_notes.trim() || null,
          instructor_id: formData.instructor_id
        })
      })

      if (!requestResponse.ok) {
        const error = await requestResponse.json()
        alert(error.error || 'Failed to submit request')
        return
      }

      setSuccessMessage('Your private lesson request has been submitted! 🎉')
      setFormData({
        requested_focus: '',
        preferred_dates: '',
        additional_notes: '',
        instructor_id: ''
      })
      await fetchRequests()
      
      setTimeout(() => setSuccessMessage(''), 5000)
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this private lesson request?')) {
      return
    }

    setDeletingId(requestId)
    try {
      const response = await fetch(`/api/dancer/lesson-requests?id=${requestId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccessMessage('Private lesson request deleted successfully')
        await fetchRequests()
        setTimeout(() => setSuccessMessage(''), 5000)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete request')
      }
    } catch (error) {
      console.error('Error deleting request:', error)
      alert('Failed to delete request')
    } finally {
      setDeletingId(null)
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, any> = {
      pending: 'warning',
      approved: 'success',
      scheduled: 'primary',
      declined: 'danger'
    }
    return colors[status] || 'default'
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      pending: '⏳',
      approved: '✅',
      scheduled: '📅',
      declined: '❌'
    }
    return icons[status] || '📝'
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Private Lesson Requests 💫
        </h1>
        <p className="text-gray-600">
          Request one-on-one time with your instructor to focus on specific skills
        </p>
      </div>

      {successMessage && (
        <div className={`mb-6 p-4 rounded-lg ${
          paymentSuccess
            ? 'bg-green-50 border border-green-200 text-green-800'
            : paymentCanceled
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          {successMessage}
        </div>
      )}

      <Card className="mb-8">
        <CardTitle className="p-4 md:p-6 pb-2 md:pb-4">Request a Private Lesson</CardTitle>
        <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <LessonPackInfo instructorId={formData.instructor_id || null} />
            
            {loadingInstructors ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-600">
                Loading instructors...
              </div>
            ) : instructors.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                No instructors available. Please contact your studio.
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Select an Instructor *
                </label>
                <select
                  value={formData.instructor_id}
                  onChange={(e) =>
                    setFormData({ ...formData, instructor_id: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="">-- Choose an instructor --</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Textarea
              label="What would you like to focus on? *"
              placeholder="Describe the skills, techniques, or areas you'd like to work on..."
              rows={4}
              value={formData.requested_focus}
              onChange={(e) =>
                setFormData({ ...formData, requested_focus: e.target.value })
              }
              required
            />
            <Input
              label="Preferred Dates"
              placeholder="e.g., Next Tuesday, December 20th, Weekday afternoons"
              value={formData.preferred_dates}
              onChange={(e) =>
                setFormData({ ...formData, preferred_dates: e.target.value })
              }
              helperText="Separate multiple dates with commas"
            />
            <Textarea
              label="Additional Notes"
              placeholder="Any other information that would be helpful..."
              rows={3}
              value={formData.additional_notes}
              onChange={(e) =>
                setFormData({ ...formData, additional_notes: e.target.value })
              }
            />
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Your Requests</h2>
      </div>

      {loadingRequests ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getStatusIcon(request.status)}</span>
                    <Badge variant={getStatusColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    <button
                      onClick={() => handleDelete(request.id)}
                      disabled={deletingId === request.id}
                      className="text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Delete request"
                    >
                      {deletingId === request.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Focus Areas:</h4>
                    <p className="text-gray-700">{request.requested_focus}</p>
                  </div>

                  {request.preferred_dates && request.preferred_dates.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Preferred Dates:</h4>
                      <div className="flex flex-wrap gap-2">
                        {request.preferred_dates.map((date, idx) => (
                          <Badge key={idx} variant="default" size="sm">
                            {date}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.additional_notes && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Additional Notes:</h4>
                      <p className="text-gray-700">{request.additional_notes}</p>
                    </div>
                  )}

                  {request.instructor_response && (
                    <div className="mt-4 pt-4 border-t border-gray-200 bg-rose-50 -mx-4 md:-mx-6 -mb-4 md:-mb-6 mt-4 p-4 md:p-6 rounded-b-lg">
                      <h4 className="font-medium text-rose-900 mb-2 flex items-center gap-2">
                        <span>💬</span>
                        Instructor Response:
                      </h4>
                      <p className="text-rose-800">{request.instructor_response}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 md:p-12 text-center">
            <div className="text-6xl mb-4">🌟</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Requests Yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Ready to take your dancing to the next level? Request a private lesson
              to get personalized attention and focus on your goals!
            </p>
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  )
}
