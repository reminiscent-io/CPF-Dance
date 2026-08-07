'use client'

import { useCallback, useState, useEffect } from 'react'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { EmptyState, PageHeader, PageSkeleton, StatusDot } from '@/components/ui'
import type { StatusTone } from '@/components/ui'
import { InboxIcon } from '@heroicons/react/24/outline'

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
    if (loading || profile?.role !== 'instructor') return
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch('/api/studio-inquiries')
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) setInquiries(data.inquiries || [])
        } else {
          setError('Failed to load inquiries')
        }
      } catch (err) {
        console.error('Error fetching inquiries:', err)
        if (!cancelled) setError('An error occurred while loading inquiries')
      } finally {
        if (!cancelled) setLoadingInquiries(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [loading, profile])

  const getStatusTone = (status: string): StatusTone => {
    switch (status?.toLowerCase()) {
      case 'responded':
        return 'positive'
      case 'contacted':
        return 'accent'
      default:
        return 'neutral'
    }
  }

  const formatStatus = (status: string) =>
    status ? status.charAt(0).toUpperCase() + status.slice(1) : 'New'

  if (loading || loadingInquiries) {
    return (
      <PortalLayout profile={profile}>
        <PageSkeleton variant="list" />
      </PortalLayout>
    )
  }

  if (!user || !profile || profile.role !== 'instructor') {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Studio Inquiries"
        subtitle="Partnership inquiries from studios where you teach"
      />

      <div className="mt-header-gap">
        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p className="text-rose-700">{error}</p>
          </div>
        )}

        {inquiries.length === 0 ? (
          <div className="rounded-lg border border-champagne-200 bg-champagne-50">
            <EmptyState
              icon={<InboxIcon />}
              message="Partnership inquiries from studios will appear here."
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {inquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                className="rounded-lg border border-champagne-200 bg-champagne-50 p-5"
              >
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="font-serif text-xl font-semibold text-charcoal-950">
                      {inquiry.studio_name}
                    </h3>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-sm font-medium text-charcoal-500">Contact person</div>
                        <p className="text-charcoal-900">{inquiry.contact_name}</p>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-charcoal-500">Email</div>
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
                        <div className="text-sm font-medium text-charcoal-500">Phone</div>
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
                    <div>
                      <div className="text-sm font-medium text-charcoal-500">Status</div>
                      <div className="mt-1">
                        <StatusDot
                          tone={getStatusTone(inquiry.status)}
                          label={formatStatus(inquiry.status)}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm font-medium text-charcoal-500">Received</div>
                      <p className="mt-1 text-charcoal-700">
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

                <div className="mt-5 border-t border-champagne-200 pt-5">
                  <div className="text-sm font-medium text-charcoal-500">Message</div>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-charcoal-700">
                    {inquiry.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
