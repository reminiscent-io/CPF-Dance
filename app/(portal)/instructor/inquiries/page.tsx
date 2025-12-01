'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface StudioInquiry {
  id: string
  studio_name: string
  contact_name: string
  contact_email: string
  contact_phone: string
  message: string
  status: string
  studio_id: string | null
  created_at: string
}

export default function InquiriesPage() {
  const { user, profile, loading } = useUser()
  const [inquiries, setInquiries] = useState<StudioInquiry[]>([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && profile && profile.role === 'instructor') {
      fetchInquiries()
    }
  }, [loading, profile])

  const fetchInquiries = async () => {
    try {
      const response = await fetch('/api/studio-inquiries')
      if (response.ok) {
        const data = await response.json()
        setInquiries(data.inquiries || [])
      } else {
        setError('Failed to load inquiries')
      }
    } catch (err) {
      console.error('Error fetching inquiries:', err)
      setError('An error occurred while loading inquiries')
    } finally {
      setLoadingInquiries(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new':
        return 'warning'
      case 'responded':
        return 'success'
      case 'contacted':
        return 'info'
      default:
        return 'default'
    }
  }

  if (loading || loadingInquiries) {
    return (
      <PortalLayout profile={profile}>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-charcoal-600">Loading inquiries...</p>
        </div>
      </PortalLayout>
    )
  }

  if (!user || !profile || profile.role !== 'instructor') {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-charcoal-950 mb-2">Studio Inquiries</h1>
          <p className="text-lg text-charcoal-800">
            View partnership inquiries from studios where you teach
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {inquiries.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-charcoal-600 mb-2">No inquiries yet</p>
              <p className="text-charcoal-500 text-sm">
                When studios submit partnership inquiries, they'll appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {inquiries.map((inquiry) => (
              <Card key={inquiry.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold text-charcoal-950 mb-4">
                        {inquiry.studio_name}
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-semibold text-charcoal-700">Contact Person</label>
                          <p className="text-charcoal-900">{inquiry.contact_name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-charcoal-700">Email</label>
                          <p>
                            <a
                              href={`mailto:${inquiry.contact_email}`}
                              className="text-rose-600 hover:underline"
                            >
                              {inquiry.contact_email}
                            </a>
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-charcoal-700">Phone</label>
                          <p>
                            <a
                              href={`tel:${inquiry.contact_phone}`}
                              className="text-rose-600 hover:underline"
                            >
                              {inquiry.contact_phone}
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="mb-4">
                        <label className="text-sm font-semibold text-charcoal-700 block mb-2">
                          Status
                        </label>
                        <Badge variant={getStatusColor(inquiry.status)} className="text-base px-3 py-1">
                          {inquiry.status || 'New'}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-charcoal-700 block mb-2">
                          Received
                        </label>
                        <p className="text-charcoal-700">
                          {new Date(inquiry.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-charcoal-200 pt-6">
                    <label className="text-sm font-semibold text-charcoal-700 block mb-2">
                      Message
                    </label>
                    <p className="text-charcoal-800 leading-relaxed whitespace-pre-wrap">
                      {inquiry.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
