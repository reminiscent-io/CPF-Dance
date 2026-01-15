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
  studio_name: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  message: string
  status: string
  created_at: string
  responded_at: string | null
  studio_id: string | null
  gmail_thread_id: string | null
  email_count: number | null
  last_email_date: string | null
  has_unread_reply: boolean | null
  studios: {
    name: string
    address: string
  } | null
}

interface ThreadMessage {
  id: string
  from: string
  to: string
  subject: string
  date: string
  snippet: string
  body: string
  isFromMe: boolean
}

interface EmailComposeModalProps {
  inquiry: StudioInquiry
  onClose: () => void
  onSent: () => void
}

function EmailComposeModal({ inquiry, onClose, onSent }: EmailComposeModalProps) {
  const [body, setBody] = useState(`<p>Hi ${inquiry.contact_name},</p><p>Thank you for reaching out!</p><p></p><p>Best regards,<br>Courtney</p>`)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      const response = await fetch('/api/admin/studio-inquiries/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: inquiry.id,
          to: inquiry.contact_email,
          subject: `CPF Dance Inquiry | ${inquiry.studio_name}`,
          body,
          studioName: inquiry.studio_name,
          contactName: inquiry.contact_name,
          originalMessage: inquiry.message,
        }),
      })

      if (response.ok) {
        alert('Email sent successfully!')
        onSent()
      } else {
        const data = await response.json()
        alert(`Failed to send email: ${data.error}`)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Reply to Inquiry</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="text"
              value={inquiry.contact_email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={`CPF Dance Inquiry | ${inquiry.studio_name}`}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={body.replace(/<[^>]*>/g, '')}
              onChange={(e) => setBody(`<p>${e.target.value.replace(/\n/g, '</p><p>')}</p>`)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
              placeholder="Write your response..."
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Original inquiry will be included:</p>
            <p className="text-sm text-gray-600 italic">&quot;{inquiry.message}&quot;</p>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={sending}>
            {sending ? <><Spinner size="sm" /> Sending...</> : 'Send Email'}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ThreadViewModalProps {
  inquiry: StudioInquiry
  onClose: () => void
}

function ThreadViewModal({ inquiry, onClose }: ThreadViewModalProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (inquiry.gmail_thread_id) {
      fetchThread()
    } else {
      setLoading(false)
    }
  }, [inquiry.gmail_thread_id])

  const fetchThread = async () => {
    try {
      const response = await fetch(`/api/admin/studio-inquiries/thread?threadId=${inquiry.gmail_thread_id}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Error fetching thread:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Email Thread: {inquiry.studio_name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No email conversation yet.</p>
              <p className="text-sm">Click "Reply" to start an email thread.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-4 ${
                  msg.isFromMe
                    ? 'bg-rose-50 border border-rose-200 ml-8'
                    : 'bg-gray-50 border border-gray-200 mr-8'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {msg.isFromMe ? 'You' : msg.from}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(msg.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {msg.isFromMe && (
                    <Badge variant="success">Sent</Badge>
                  )}
                </div>
                <div
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: msg.body }}
                />
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function AdminStudioInquiriesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [inquiries, setInquiries] = useState<StudioInquiry[]>([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)
  const [updatingInquiry, setUpdatingInquiry] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [refreshingInbox, setRefreshingInbox] = useState(false)
  const [composeForInquiry, setComposeForInquiry] = useState<StudioInquiry | null>(null)
  const [viewThreadForInquiry, setViewThreadForInquiry] = useState<StudioInquiry | null>(null)
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

  const handleRefreshInbox = async () => {
    setRefreshingInbox(true)
    try {
      const response = await fetch('/api/admin/studio-inquiries/refresh-inbox', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        await fetchInquiries()
        alert(data.message)
      } else {
        alert('Failed to refresh inbox')
      }
    } catch (error) {
      console.error('Error refreshing inbox:', error)
      alert('Failed to refresh inbox')
    } finally {
      setRefreshingInbox(false)
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>
              Studio Inquiries
            </h1>
            <p className="text-gray-600">Manage contact form submissions from your website</p>
          </div>

          <Button
            variant="outline"
            onClick={handleRefreshInbox}
            disabled={refreshingInbox}
          >
            {refreshingInbox ? (
              <>
                <Spinner size="sm" />
                <span className="ml-2">Refreshing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Inbox
              </>
            )}
          </Button>
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
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-xl font-bold text-gray-900">
                            {inquiry.studio_name}
                          </h3>
                          <Badge variant={getStatusBadgeVariant(inquiry.status)}>
                            {inquiry.status}
                          </Badge>
                          {inquiry.has_unread_reply && (
                            <Badge variant="warning">New Reply</Badge>
                          )}
                          {inquiry.gmail_thread_id && (
                            <Badge variant="default">
                              {inquiry.email_count || 0} email{(inquiry.email_count || 0) !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-500 mb-2">Contact: {inquiry.contact_name}</p>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${inquiry.contact_email}`} className="text-blue-600 hover:underline">
                              {inquiry.contact_email}
                            </a>
                          </div>
                          {inquiry.contact_phone && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <a href={`tel:${inquiry.contact_phone}`} className="text-blue-600 hover:underline">
                                {inquiry.contact_phone}
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
                              <span>{inquiry.studios.name} - {inquiry.studios.address}</span>
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

                        {inquiry.last_email_date && (
                          <p className="text-xs text-gray-500">
                            Last email: {new Date(inquiry.last_email_date).toLocaleDateString('en-US', {
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
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setComposeForInquiry(inquiry)}
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Reply
                        </Button>

                        {inquiry.gmail_thread_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewThreadForInquiry(inquiry)}
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            View Thread
                          </Button>
                        )}

                        {inquiry.status === 'new' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(inquiry.id, 'responded')}
                            disabled={updatingInquiry === inquiry.id}
                          >
                            {updatingInquiry === inquiry.id ? <Spinner size="sm" /> : 'Mark Responded'}
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

      {/* Compose Email Modal */}
      {composeForInquiry && (
        <EmailComposeModal
          inquiry={composeForInquiry}
          onClose={() => setComposeForInquiry(null)}
          onSent={() => {
            setComposeForInquiry(null)
            fetchInquiries()
          }}
        />
      )}

      {/* View Thread Modal */}
      {viewThreadForInquiry && (
        <ThreadViewModal
          inquiry={viewThreadForInquiry}
          onClose={() => setViewThreadForInquiry(null)}
        />
      )}
    </PortalLayout>
  )
}
