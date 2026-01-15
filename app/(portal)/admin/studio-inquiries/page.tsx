'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface StudioInquiry {
  id: string
  name: string
  email: string
  phone: string | null
  message: string
  status: string
  created_at: string
  responded_at: string | null
  responded_by: string | null
  studio_id: string | null
  studios: {
    name: string
    location: string
  } | null
}

export default function AdminStudioInquiriesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [inquiries, setInquiries] = useState<StudioInquiry[]>([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)
  const [updatingInquiry, setUpdatingInquiry] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      const redirectPath = profile.role === 'instructor' ? '/instructor' : profile.role === 'dancer' ? '/dancer' : '/login'
      router.push(redirectPath)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && profile.role === 'admin' && !hasFetched.current) {
      hasFetched.current = true
      fetchInquiries()
    }
  }, [loading, user, profile])

  const fetchInquiries = async () => {
    try {
      const response = await fetch('/api/admin/studio-inquiries')
      if (response.ok) {
        const data = await response.json()
        setInquiries(data.inquiries)
      }
    } catch (error) {
      console.error('Error fetching inquiries:', error)
    } finally {
      setLoadingInquiries(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingInquiry(id)
    try {
      const response = await fetch('/api/admin/studio-inquiries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })

      if (response.ok) {
        await fetchInquiries()
      }
    } catch (error) {
      console.error('Error updating inquiry:', error)
      alert('Failed to update inquiry status')
    } finally {
      setUpdatingInquiry(null)
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

  if (!user || !profile || profile.role !== 'admin') {
    return null
  }

  const filteredInquiries = statusFilter === 'all'
    ? inquiries
    : inquiries.filter(inq => inq.status === statusFilter)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'new':
        return 'warning'
      case 'responded':
        return 'success'
      case 'closed':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
            Studio Inquiries
          </h1>
          <p className="text-gray-600">Manage contact form submissions from your website</p>
        </div>

        {/* Status Filter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-rose-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({inquiries.length})
              </button>
              <button
                onClick={() => setStatusFilter('new')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'new'
                    ? 'bg-rose-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                New ({inquiries.filter(i => i.status === 'new').length})
              </button>
              <button
                onClick={() => setStatusFilter('responded')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === 'responded'
                    ? 'bg-rose-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Responded ({inquiries.filter(i => i.status === 'responded').length})
              </button>
            </div>
          </CardContent>
        </Card>

        {loadingInquiries ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-2">
              Showing {filteredInquiries.length} of {inquiries.length} inquiries
            </div>

            {/* Inquiries List */}
            <div className="space-y-4">
              {filteredInquiries.map((inquiry) => (
                <Card key={inquiry.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {inquiry.name}
                          </h3>
                          <Badge variant={getStatusBadgeVariant(inquiry.status)}>
                            {inquiry.status}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${inquiry.email}`} className="text-blue-600 hover:underline">
                              {inquiry.email}
                            </a>
                          </div>
                          {inquiry.phone && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <a href={`tel:${inquiry.phone}`} className="text-blue-600 hover:underline">
                                {inquiry.phone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                              Submitted: {new Date(inquiry.created_at).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {inquiry.studios && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{inquiry.studios.name} - {inquiry.studios.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{inquiry.message}</p>
                        </div>

                        {inquiry.responded_at && (
                          <p className="text-xs text-gray-500">
                            Responded: {new Date(inquiry.responded_at).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex flex-col gap-2">
                        {inquiry.status === 'new' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateStatus(inquiry.id, 'responded')}
                            disabled={updatingInquiry === inquiry.id}
                          >
                            {updatingInquiry === inquiry.id ? <Spinner size="sm" /> : 'Mark as Responded'}
                          </Button>
                        )}
                        {inquiry.status === 'responded' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(inquiry.id, 'new')}
                            disabled={updatingInquiry === inquiry.id}
                          >
                            {updatingInquiry === inquiry.id ? <Spinner size="sm" /> : 'Mark as New'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredInquiries.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="text-6xl mb-4">📧</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Inquiries
                    </h3>
                    <p className="text-gray-600">
                      {statusFilter === 'all'
                        ? 'No studio inquiries have been submitted yet.'
                        : `No ${statusFilter} inquiries found.`}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </PortalLayout>
  )
}
