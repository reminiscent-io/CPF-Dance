'use client'

import { useState, useEffect } from 'react'
import { Card, Button, Badge, Modal, ModalFooter, useToast, Input, Textarea } from '@/components/ui'
import { Spinner } from '@/components/ui'
import type { Studio } from '@/lib/types'

interface StudioInquiry {
  id: string
  studio_name: string
  contact_name: string
  contact_email: string
  contact_phone?: string
  message?: string
  status: string
  studio_id?: string
  created_at: string
  is_responded?: boolean
  contact_method?: string
  response_notes?: string
  responded_at?: string
}

interface CommunicationsSectionProps {
  studios: Studio[]
  profile: any
}

const CONTACT_METHODS = ['email', 'instagram', 'phone', 'in-person']

export function CommunicationsSection({ studios, profile }: CommunicationsSectionProps) {
  const [inquiries, setInquiries] = useState<StudioInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState<StudioInquiry | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [selectedStudioId, setSelectedStudioId] = useState<string>('')
  const [contactMethod, setContactMethod] = useState<string>('')
  const [responseNotes, setResponseNotes] = useState<string>('')
  const [linking, setLinking] = useState(false)
  const [responding, setResponding] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('new')
  const [filterResponded, setFilterResponded] = useState<boolean | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    fetchInquiries()
  }, [filterStatus, filterResponded])

  const fetchInquiries = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterStatus) {
        params.append('status', filterStatus)
      }

      const response = await fetch(`/api/studio-inquiries?${params}`)
      if (!response.ok) throw new Error('Failed to fetch inquiries')

      const data = await response.json()
      let fetchedInquiries = data.inquiries || []
      
      // Client-side filter for responded status
      if (filterResponded !== null) {
        fetchedInquiries = fetchedInquiries.filter((i: StudioInquiry) => i.is_responded === filterResponded)
      }
      
      setInquiries(fetchedInquiries)
    } catch (error) {
      console.error('Error fetching inquiries:', error)
      addToast('Failed to load inquiries', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLinkStudio = async () => {
    if (!selectedInquiry || !selectedStudioId) return

    try {
      setLinking(true)
      const response = await fetch(`/api/studio-inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studio_id: selectedStudioId || null })
      })

      if (!response.ok) throw new Error('Failed to link studio')

      const { inquiry } = await response.json()
      setInquiries(prev => prev.map(i => i.id === inquiry.id ? inquiry : i))
      setShowLinkModal(false)
      setSelectedInquiry(null)
      setSelectedStudioId('')
      addToast('Studio linked successfully', 'success')
    } catch (error) {
      console.error('Error linking studio:', error)
      addToast('Failed to link studio', 'error')
    } finally {
      setLinking(false)
    }
  }

  const handleMarkResponded = async () => {
    if (!selectedInquiry || !contactMethod) return

    try {
      setResponding(true)
      const response = await fetch(`/api/studio-inquiries/${selectedInquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_responded: true,
          contact_method: contactMethod,
          response_notes: responseNotes
        })
      })

      if (!response.ok) throw new Error('Failed to mark as responded')

      const { inquiry } = await response.json()
      setInquiries(prev => prev.map(i => i.id === inquiry.id ? inquiry : i))
      setShowResponseModal(false)
      setSelectedInquiry(null)
      setContactMethod('')
      setResponseNotes('')
      addToast('Response tracked successfully', 'success')
    } catch (error) {
      console.error('Error tracking response:', error)
      addToast('Failed to track response', 'error')
    } finally {
      setResponding(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'default'
      case 'contacted':
        return 'secondary'
      case 'converted':
        return 'success'
      case 'declined':
        return 'default'
      default:
        return 'default'
    }
  }

  if (profile?.role !== 'admin') {
    return null
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Communications</h2>
        <p className="text-gray-600">Manage studio inquiries, link to studios, and track your responses</p>
      </div>

      <div className="mb-6 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700 self-center">Status:</span>
          {['new', 'contacted', 'converted', 'declined'].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? 'primary' : 'outline'}
              onClick={() => setFilterStatus(status)}
              className="capitalize text-sm"
              size="sm"
            >
              {status}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700 self-center">Response:</span>
          <Button
            variant={filterResponded === null ? 'primary' : 'outline'}
            onClick={() => setFilterResponded(null)}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterResponded === false ? 'primary' : 'outline'}
            onClick={() => setFilterResponded(false)}
            size="sm"
          >
            Not Responded
          </Button>
          <Button
            variant={filterResponded === true ? 'primary' : 'outline'}
            onClick={() => setFilterResponded(true)}
            size="sm"
          >
            Responded
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : inquiries.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-600">
            No inquiries found
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => {
            const linkedStudio = inquiry.studio_id ? studios.find(s => s.id === inquiry.studio_id) : null

            return (
              <Card key={inquiry.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{inquiry.studio_name}</h3>
                      <Badge variant={getStatusColor(inquiry.status)} className="capitalize text-xs">
                        {inquiry.status}
                      </Badge>
                      {inquiry.is_responded && (
                        <Badge variant="success" className="text-xs">
                          ✓ Responded
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      From: <span className="font-medium">{inquiry.contact_name}</span> • {' '}
                      <a href={`mailto:${inquiry.contact_email}`} className="text-rose-600 hover:text-rose-700">
                        {inquiry.contact_email}
                      </a>
                      {inquiry.contact_phone && (
                        <> • <a href={`tel:${inquiry.contact_phone}`} className="text-rose-600 hover:text-rose-700">
                          {inquiry.contact_phone}
                        </a></>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </div>
                </div>

                {inquiry.message && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-700">{inquiry.message}</p>
                  </div>
                )}

                {inquiry.is_responded && inquiry.response_notes && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-xs font-medium text-green-800 mb-1">
                      📌 Your Response via {inquiry.contact_method ? inquiry.contact_method.toUpperCase() : 'EMAIL'}
                      {inquiry.responded_at && (
                        <span className="text-gray-600"> • {new Date(inquiry.responded_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    <p className="text-sm text-green-900">{inquiry.response_notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 flex-wrap gap-3">
                  <div>
                    {linkedStudio ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Studio:</span>
                        <Badge variant="success" className="text-xs">{linkedStudio.name}</Badge>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No studio linked</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={inquiry.is_responded ? "outline" : "primary"}
                      onClick={() => {
                        setSelectedInquiry(inquiry)
                        setContactMethod(inquiry.contact_method || '')
                        setResponseNotes(inquiry.response_notes || '')
                        setShowResponseModal(true)
                      }}
                    >
                      {inquiry.is_responded ? 'Edit Response' : 'Track Response'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedInquiry(inquiry)
                        setSelectedStudioId(inquiry.studio_id || '')
                        setShowLinkModal(true)
                      }}
                    >
                      Link Studio
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {showResponseModal && selectedInquiry && (
        <Modal isOpen={true} onClose={() => setShowResponseModal(false)} title="Track Your Response" size="md">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Inquiry from: <span className="font-semibold">{selectedInquiry.studio_name}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Method *</label>
              <select
                value={contactMethod}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContactMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              >
                <option value="">— Select method —</option>
                {CONTACT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <Textarea
              label="Response Notes"
              placeholder="Add notes about your response (e.g., what you discussed, next steps)"
              rows={4}
              value={responseNotes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponseNotes(e.target.value)}
            />
          </div>

          <ModalFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowResponseModal(false)}
              disabled={responding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkResponded}
              disabled={responding || !contactMethod}
            >
              {responding ? 'Saving...' : 'Save Response'}
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {showLinkModal && selectedInquiry && (
        <Modal isOpen={true} onClose={() => setShowLinkModal(false)} title="Link Studio to Inquiry" size="md">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Inquiry from: <span className="font-semibold">{selectedInquiry.studio_name}</span>
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Studio</label>
              <select
                value={selectedStudioId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedStudioId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="">— Clear Link —</option>
                {studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ModalFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLinkModal(false)}
              disabled={linking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkStudio}
              disabled={linking}
            >
              {linking ? 'Linking...' : 'Link Studio'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
