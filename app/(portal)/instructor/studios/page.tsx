'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Input, Modal, ModalFooter, Textarea, Badge, useToast, Spinner, GooglePlacesInput, PlaceDetails } from '@/components/ui'
import { CommunicationsSection } from '@/components/CommunicationsSection'
import type { Studio, CreateStudioData } from '@/lib/types'

export default function StudiosPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()

  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)
  const [filterActive, setFilterActive] = useState<boolean | null>(null)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'studio' ? 'studio' : 'dancer'}`)
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchStudios()
    }
  }, [user, filterActive])

  const fetchStudios = async () => {
    try {
      const params = new URLSearchParams()
      if (filterActive !== null) {
        params.append('is_active', filterActive.toString())
      }

      const response = await fetch(`/api/studios?${params}`)
      if (!response.ok) throw new Error('Failed to fetch studios')

      const data = await response.json()
      setStudios(data.studios || [])
    } catch (error) {
      console.error('Error fetching studios:', error)
      addToast('Failed to load studios', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudio = async (formData: CreateStudioData) => {
    try {
      const response = await fetch('/api/studios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to create studio')

      const { studio } = await response.json()
      setStudios(prev => [studio, ...prev])
      setShowAddModal(false)
      addToast('Studio added successfully', 'success')
    } catch (error) {
      console.error('Error adding studio:', error)
      addToast('Failed to add studio', 'error')
    }
  }

  const handleUpdateStudio = async (studioId: string, formData: CreateStudioData & { is_active?: boolean }) => {
    try {
      const response = await fetch(`/api/studios/${studioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to update studio')

      const { studio } = await response.json()
      setStudios(prev => prev.map(s => s.id === studioId ? studio : s))
      setShowEditModal(false)
      setSelectedStudio(null)
      addToast('Studio updated successfully', 'success')
    } catch (error) {
      console.error('Error updating studio:', error)
      addToast('Failed to update studio', 'error')
    }
  }

  const handleStudioClick = (studio: Studio) => {
    setSelectedStudio(studio)
    setShowEditModal(true)
  }

  if (authLoading || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  const filteredStudios = filterActive !== null
    ? studios.filter(s => s.is_active === filterActive)
    : studios

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Studios</h1>
            <p className="text-gray-600 mt-1">Manage studio locations and contacts</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            Add Studio
          </Button>
        </div>

        <div className="flex gap-3">
          <Button
            variant={filterActive === null ? 'primary' : 'outline'}
            onClick={() => setFilterActive(null)}
          >
            All Studios
          </Button>
          <Button
            variant={filterActive === true ? 'primary' : 'outline'}
            onClick={() => setFilterActive(true)}
          >
            Active
          </Button>
          <Button
            variant={filterActive === false ? 'primary' : 'outline'}
            onClick={() => setFilterActive(false)}
          >
            Inactive
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredStudios.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-600">
            No studios found
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudios.map((studio) => (
            <Card
              key={studio.id}
              hover
              className="cursor-pointer"
              onClick={() => handleStudioClick(studio)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex-1">
                  {studio.name}
                </h3>
                <Badge variant={studio.is_active ? 'success' : 'default'}>
                  {studio.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Address */}
              {(studio.address || studio.city || studio.state || studio.zip_code) && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-1">📍 Location</div>
                  {studio.address && (
                    <div className="text-sm text-gray-600">{studio.address}</div>
                  )}
                  {(studio.city || studio.state || studio.zip_code) && (
                    <div className="text-sm text-gray-600">
                      {[studio.city, studio.state, studio.zip_code].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-2 mb-4">
                {studio.contact_email && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">📧 Email</div>
                    <a
                      href={`mailto:${studio.contact_email}`}
                      className="text-sm text-rose-600 hover:text-rose-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {studio.contact_email}
                    </a>
                  </div>
                )}
                {studio.contact_phone && (
                  <div>
                    <div className="text-sm font-medium text-gray-700">📞 Phone</div>
                    <a
                      href={`tel:${studio.contact_phone}`}
                      className="text-sm text-rose-600 hover:text-rose-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {studio.contact_phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              {studio.notes && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-700 mb-1">Notes</div>
                  <p className="text-sm text-gray-600 line-clamp-2">{studio.notes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddStudioModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddStudio}
        />
      )}

      {showEditModal && selectedStudio && (
        <EditStudioModal
          studio={selectedStudio}
          onClose={() => {
            setShowEditModal(false)
            setSelectedStudio(null)
          }}
          onSubmit={(formData) => handleUpdateStudio(selectedStudio.id, formData)}
        />
      )}

      <CommunicationsSection studios={studios} profile={profile} />
    </PortalLayout>
  )
}

interface EditStudioModalProps {
  studio: Studio
  onClose: () => void
  onSubmit: (data: CreateStudioData & { is_active?: boolean }) => void
}

function EditStudioModal({ studio, onClose, onSubmit }: EditStudioModalProps) {
  const [formData, setFormData] = useState<CreateStudioData & { is_active: boolean }>({
    name: studio.name,
    address: studio.address || '',
    city: studio.city || '',
    state: studio.state || '',
    zip_code: studio.zip_code || '',
    contact_email: studio.contact_email || '',
    contact_phone: studio.contact_phone || '',
    notes: studio.notes || '',
    is_active: studio.is_active
  })

  const handlePlaceSelect = (details: PlaceDetails) => {
    setFormData({
      ...formData,
      address: details.address,
      city: details.city,
      state: details.state,
      zip_code: details.zip_code
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      return
    }
    onSubmit(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Studio" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Studio Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <GooglePlacesInput
            label="Address"
            value={`${formData.address}${formData.city ? ', ' + formData.city : ''}${formData.state ? ', ' + formData.state : ''}${formData.zip_code ? ' ' + formData.zip_code : ''}`}
            onChange={(value, details) => {
              if (details) {
                handlePlaceSelect(details)
              } else {
                setFormData({ ...formData, address: value })
              }
            }}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for studio address..."
          />

          {formData.address && (
            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-xs text-gray-600">Address</p>
                <p className="text-sm font-medium text-gray-900">{formData.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">City</p>
                <p className="text-sm font-medium text-gray-900">{formData.city || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">State, Zip</p>
                <p className="text-sm font-medium text-gray-900">{formData.state} {formData.zip_code}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            />
            <Input
              label="Contact Phone"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
          </div>

          <Textarea
            label="Notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2 h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Active Studio</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Inactive studios won't appear in class creation dropdowns
            </p>
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}

interface AddStudioModalProps {
  onClose: () => void
  onSubmit: (data: CreateStudioData) => void
}

function AddStudioModal({ onClose, onSubmit }: AddStudioModalProps) {
  const [formData, setFormData] = useState<CreateStudioData>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    contact_email: '',
    contact_phone: '',
    notes: ''
  })

  const handlePlaceSelect = (details: PlaceDetails) => {
    setFormData({
      ...formData,
      address: details.address,
      city: details.city,
      state: details.state,
      zip_code: details.zip_code
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      return
    }
    onSubmit(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Studio" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Studio Name *"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <GooglePlacesInput
            label="Address"
            value={`${formData.address}${formData.city ? ', ' + formData.city : ''}${formData.state ? ', ' + formData.state : ''}${formData.zip_code ? ' ' + formData.zip_code : ''}`}
            onChange={(value, details) => {
              if (details) {
                handlePlaceSelect(details)
              } else {
                setFormData({ ...formData, address: value })
              }
            }}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for studio address..."
          />

          {formData.address && (
            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-xs text-gray-600">Address</p>
                <p className="text-sm font-medium text-gray-900">{formData.address}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">City</p>
                <p className="text-sm font-medium text-gray-900">{formData.city || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">State, Zip</p>
                <p className="text-sm font-medium text-gray-900">{formData.state} {formData.zip_code}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contact Email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            />
            <Input
              label="Contact Phone"
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            />
          </div>

          <Textarea
            label="Notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Studio</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
