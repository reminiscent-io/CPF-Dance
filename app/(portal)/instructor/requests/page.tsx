'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle, Button, Badge, Spinner, useToast } from '@/components/ui'

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

  useEffect(() => {
    if (!loading && profile && (profile.role === 'instructor' || profile.role === 'admin')) {
      fetchRequests()
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

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      case 'approved':
        return <Badge variant="success">Approved</Badge>
      case 'confirmed':
        return <Badge variant="success">Confirmed</Badge>
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
                      <Card key={request.id} className="border-l-4 border-l-amber-400">
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
                            
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => updateStatus(request.id, 'approved')}
                                disabled={updatingId === request.id}
                              >
                                {updatingId === request.id ? 'Updating...' : 'Approve'}
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
                    const contact = getStudentContact(request)
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
    </PortalLayout>
  )
}
