'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Button, EmptyState, Input, Modal, ModalFooter, PageHeader, PageSkeleton, SegmentedControl, SkeletonCardGrid, StatusDot, Textarea, Toolbar, useToast, GooglePlacesInput, PlaceDetails } from '@/components/ui'
import { BuildingStorefrontIcon, PlusIcon } from '@heroicons/react/24/outline'
import { CommunicationsSection } from '@/components/CommunicationsSection'
import type { Studio, CreateStudioData } from '@/lib/types'

type StudioFilter = 'all' | 'active' | 'inactive'

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
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const fetchStudios = async () => {
      try {
        const params = new URLSearchParams()
        if (filterActive !== null) {
          params.append('is_active', filterActive.toString())
        }

        const response = await fetch(`/api/studios?${params}`)
        if (!response.ok) throw new Error('Failed to fetch studios')

        const data = await response.json()
        if (!cancelled) setStudios(data.studios || [])
      } catch (error) {
        console.error('Error fetching studios:', error)
        if (!cancelled) addToast('Failed to load studios', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchStudios()
    return () => { cancelled = true }
  }, [user?.id, filterActive, addToast])

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
      <PortalLayout profile={profile}>
        <PageSkeleton variant="cards" withAction withToolbar cardCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
      </PortalLayout>
    )
  }

  const filteredStudios = filterActive !== null
    ? studios.filter(s => s.is_active === filterActive)
    : studios

  let studioFilter: StudioFilter = 'all'
  if (filterActive !== null) studioFilter = filterActive ? 'active' : 'inactive'

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Studios"
        subtitle="Manage studio locations and contacts"
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
            Add studio
          </Button>
        }
      />

      <Toolbar
        filters={
          <SegmentedControl<StudioFilter>
            aria-label="Filter studios by status"
            options={[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            value={studioFilter}
            onChange={(value) => setFilterActive(value === 'all' ? null : value === 'active')}
          />
        }
      />

      <div className="mt-toolbar-gap">
        {loading ? (
          <SkeletonCardGrid count={6} cols="grid-cols-1 md:grid-cols-2 lg:grid-cols-3" gap="gap-4" />
        ) : filteredStudios.length === 0 ? (
          <div className="rounded-lg border border-champagne-200 bg-champagne-50">
            <EmptyState
              icon={<BuildingStorefrontIcon />}
              message={
                filterActive !== null
                  ? 'No studios match this view.'
                  : 'No studios yet.'
              }
              action={
                filterActive === null ? (
                  <Button variant="secondary" onClick={() => setShowAddModal(true)}>
                    <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
                    Add studio
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudios.map((studio) => (
              <div
                key={studio.id}
                onClick={() => handleStudioClick(studio)}
                className="cursor-pointer rounded-lg border border-champagne-200 bg-champagne-50 p-4 transition-colors hover:bg-champagne-100 active:bg-champagne-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="flex-1 font-serif text-lg font-semibold text-charcoal-950">
                    {studio.name}
                  </h3>
                  <StatusDot
                    tone={studio.is_active ? 'positive' : 'neutral'}
                    label={studio.is_active ? 'Active' : 'Inactive'}
                  />
                </div>

                {/* Address */}
                {(studio.address || studio.city || studio.state || studio.zip_code) && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-charcoal-500">Location</div>
                    {studio.address && (
                      <div className="text-sm text-charcoal-700">{studio.address}</div>
                    )}
                    {(studio.city || studio.state || studio.zip_code) && (
                      <div className="text-sm text-charcoal-700">
                        {[studio.city, studio.state, studio.zip_code].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Information */}
                {(studio.contact_email || studio.contact_phone) && (
                  <div className="mt-3 space-y-2">
                    {studio.contact_email && (
                      <div>
                        <div className="text-sm font-medium text-charcoal-500">Email</div>
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
                        <div className="text-sm font-medium text-charcoal-500">Phone</div>
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
                )}

                {/* Notes */}
                {studio.notes && (
                  <div className="mt-3 border-t border-champagne-200 pt-3">
                    <div className="text-sm font-medium text-charcoal-500">Notes</div>
                    <p className="text-sm text-charcoal-700 line-clamp-2">{studio.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
                <p className="text-xs text-charcoal-500">Address</p>
                <p className="text-sm font-medium text-charcoal-950">{formData.address}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">City</p>
                <p className="text-sm font-medium text-charcoal-950">{formData.city || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">State, Zip</p>
                <p className="text-sm font-medium text-charcoal-950">{formData.state} {formData.zip_code}</p>
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
              <span className="text-sm font-medium text-charcoal-700">Active Studio</span>
            </label>
            <p className="text-xs text-charcoal-500 mt-1">
              Inactive studios won’t appear in class creation dropdowns
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
                <p className="text-xs text-charcoal-500">Address</p>
                <p className="text-sm font-medium text-charcoal-950">{formData.address}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">City</p>
                <p className="text-sm font-medium text-charcoal-950">{formData.city || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-500">State, Zip</p>
                <p className="text-sm font-medium text-charcoal-950">{formData.state} {formData.zip_code}</p>
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
