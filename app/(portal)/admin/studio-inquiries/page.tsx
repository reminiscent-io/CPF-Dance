'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Spinner,
  StatusDot,
  Toolbar
} from '@/components/ui'
import type { StatusTone } from '@/components/ui'
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { createSanitizedHtml } from '@/lib/utils/sanitize'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

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
  const [sending, setSending] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Write your response...',
      }),
    ],
    content: `<p>Hi ${inquiry.contact_name},</p><p>Thank you for reaching out!</p><p></p><p>Best regards,<br>Courtney</p>`,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-3 py-2',
      },
    },
    immediatelyRender: false,
  })

  const handleSend = async () => {
    if (!editor) return
    setSending(true)
    try {
      const response = await fetch('/api/admin/studio-inquiries/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inquiryId: inquiry.id,
          to: inquiry.contact_email,
          subject: `CPF Dance Inquiry | ${inquiry.studio_name}`,
          body: editor.getHTML(),
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
      <div className="bg-champagne-50 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-champagne-200 flex justify-between items-center">
          <h2 className="font-serif text-xl font-semibold text-charcoal-950">Reply to Inquiry</h2>
          <button onClick={onClose} className="text-charcoal-500 hover:text-charcoal-700">
            <XMarkIcon className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-auto">
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">To</label>
            <input
              type="text"
              value={inquiry.contact_email}
              disabled
              className="w-full px-3 py-2 border border-champagne-300 rounded-lg bg-champagne-100 text-charcoal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">Subject</label>
            <input
              type="text"
              value={`CPF Dance Inquiry | ${inquiry.studio_name}`}
              disabled
              className="w-full px-3 py-2 border border-champagne-300 rounded-lg bg-champagne-100 text-charcoal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">Message</label>
            <div className="border border-champagne-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-rose-500 focus-within:border-transparent">
              {/* Formatting Toolbar */}
              <div className="bg-champagne-100 border-b border-champagne-200 p-2 flex gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  className={`p-2 rounded hover:bg-champagne-200 transition-colors ${editor?.isActive('bold') ? 'bg-champagne-200 text-rose-700' : 'text-charcoal-500'}`}
                  title="Bold"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h7a4 4 0 014 4 4 4 0 01-4 4H6z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  className={`p-2 rounded hover:bg-champagne-200 transition-colors ${editor?.isActive('italic') ? 'bg-champagne-200 text-rose-700' : 'text-charcoal-500'}`}
                  title="Italic"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 0v16m-4 0h8" transform="skewX(-12)" />
                  </svg>
                </button>
                <div className="w-px bg-champagne-300 mx-1" />
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  className={`p-2 rounded hover:bg-champagne-200 transition-colors ${editor?.isActive('bulletList') ? 'bg-champagne-200 text-rose-700' : 'text-charcoal-500'}`}
                  title="Bullet List"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  className={`p-2 rounded hover:bg-champagne-200 transition-colors ${editor?.isActive('orderedList') ? 'bg-champagne-200 text-rose-700' : 'text-charcoal-500'}`}
                  title="Numbered List"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M4 6v4m0 4h.01M8 6h12M4 12h.01M8 12h12M4 18h.01M8 18h12" />
                  </svg>
                </button>
              </div>
              {/* Editor */}
              {editor ? (
                <EditorContent editor={editor} className="bg-champagne-50" />
              ) : (
                <div className="min-h-[200px] px-3 py-2 flex items-center justify-center">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-champagne-100 rounded-lg p-4">
            <p className="text-xs font-medium text-charcoal-500 mb-2">Original inquiry will be included:</p>
            <p className="text-sm text-charcoal-700 italic">&quot;{inquiry.message}&quot;</p>
          </div>
        </div>

        <div className="p-4 border-t border-champagne-200 flex justify-end gap-3">
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
      <div className="bg-champagne-50 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-champagne-200 flex justify-between items-center">
          <h2 className="font-serif text-xl font-semibold text-charcoal-950">
            Email Thread: {inquiry.studio_name}
          </h2>
          <button onClick={onClose} className="text-charcoal-500 hover:text-charcoal-700">
            <XMarkIcon className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-charcoal-500">
              <p>No email conversation yet.</p>
              <p className="text-sm">Click “Reply” to start an email thread.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg p-4 ${
                  msg.isFromMe
                    ? 'bg-rose-50 border border-rose-200 ml-8'
                    : 'bg-champagne-100 border border-champagne-200 mr-8'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-charcoal-900">
                      {msg.isFromMe ? 'You' : msg.from}
                    </p>
                    <p className="text-xs text-charcoal-500">
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
                  className="text-sm text-charcoal-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={createSanitizedHtml(msg.body)}
                />
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-champagne-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

const getStatusTone = (status: string): StatusTone => {
  switch (status) {
    case 'responded':
      return 'positive'
    case 'new':
    case 'closed':
    default:
      return 'neutral'
  }
}

const formatStatusLabel = (status: string) =>
  status.charAt(0).toUpperCase() + status.slice(1)

const formatTimestamp = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })

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
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4">Loading...</p>
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

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Studio Inquiries"
        subtitle="Manage contact form submissions from your website"
        action={
          <Button
            variant="outline"
            size="sm"
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
                <ArrowPathIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                Refresh Inbox
              </>
            )}
          </Button>
        }
      />

      <Toolbar
        filters={
          <SegmentedControl<string>
            aria-label="Filter inquiries by status"
            options={[
              { value: 'all', label: `All (${inquiries.length})` },
              { value: 'new', label: `New (${inquiries.filter(i => i.status === 'new').length})` },
              { value: 'responded', label: `Responded (${inquiries.filter(i => i.status === 'responded').length})` }
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        }
      />

      <div className="mt-toolbar-gap">
        {loadingInquiries ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-charcoal-500">
              Showing {filteredInquiries.length} of {inquiries.length} inquiries
            </p>

            {/* Inquiries List */}
            <div className="space-y-4">
              {filteredInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="rounded-lg border border-champagne-200 bg-champagne-50 p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="font-serif text-xl font-semibold text-charcoal-950">
                          {inquiry.studio_name}
                        </h3>
                        <StatusDot
                          tone={getStatusTone(inquiry.status)}
                          label={formatStatusLabel(inquiry.status)}
                        />
                        {inquiry.has_unread_reply && (
                          <Badge variant="warning">New Reply</Badge>
                        )}
                        {inquiry.gmail_thread_id && (
                          <Badge variant="default">
                            {inquiry.email_count || 0} email{(inquiry.email_count || 0) !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-charcoal-500 mb-2">Contact: {inquiry.contact_name}</p>

                      <div className="space-y-2 text-sm text-charcoal-500 mb-4">
                        <div className="flex items-center gap-2">
                          <EnvelopeIcon className="w-4 h-4" aria-hidden="true" />
                          <a href={`mailto:${inquiry.contact_email}`} className="text-rose-700 hover:underline">
                            {inquiry.contact_email}
                          </a>
                        </div>
                        {inquiry.contact_phone && (
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="w-4 h-4" aria-hidden="true" />
                            <a href={`tel:${inquiry.contact_phone}`} className="text-rose-700 hover:underline">
                              {inquiry.contact_phone}
                            </a>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <CalendarDaysIcon className="w-4 h-4" aria-hidden="true" />
                          <span>Submitted: {formatTimestamp(inquiry.created_at)}</span>
                        </div>
                        {inquiry.studios && (
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="w-4 h-4" aria-hidden="true" />
                            <span>{inquiry.studios.name} - {inquiry.studios.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-champagne-100 rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-charcoal-700 mb-2">Message:</p>
                        <p className="text-sm text-charcoal-700 whitespace-pre-wrap">{inquiry.message}</p>
                      </div>

                      {inquiry.responded_at && (
                        <p className="text-xs text-charcoal-500">
                          Responded: {formatTimestamp(inquiry.responded_at)}
                        </p>
                      )}

                      {inquiry.last_email_date && (
                        <p className="text-xs text-charcoal-500">
                          Last email: {formatTimestamp(inquiry.last_email_date)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setComposeForInquiry(inquiry)}
                      >
                        <EnvelopeIcon className="w-4 h-4 mr-1" aria-hidden="true" />
                        Reply
                      </Button>

                      {inquiry.gmail_thread_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewThreadForInquiry(inquiry)}
                        >
                          <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1" aria-hidden="true" />
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
                </div>
              ))}

              {filteredInquiries.length === 0 && (
                <div className="rounded-lg border border-champagne-200 bg-champagne-50">
                  <EmptyState
                    icon={<EnvelopeIcon />}
                    message={
                      statusFilter === 'all'
                        ? 'No studio inquiries have been submitted yet.'
                        : `No ${statusFilter} inquiries found.`
                    }
                  />
                </div>
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
