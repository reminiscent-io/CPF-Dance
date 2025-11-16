'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Input, Modal, ModalFooter, Textarea, Table, useToast, Spinner } from '@/components/ui'
import type { Studio, CreateStudioData } from '@/lib/types'

export default function StudiosPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor') {
      router.push(`/${profile.role === 'studio_admin' ? 'studio' : 'dancer'}`)
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchStudios()
    }
  }, [user])

  const fetchStudios = async () => {
    try {
      const response = await fetch('/api/studios')
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

  if (authLoading || !profile || profile.role !== 'instructor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  const columns = [
    {
      key: 'name',
      header: 'Name'
    },
    {
      key: 'location',
      header: 'Location',
      render: (studio: Studio) => {
        const parts = [studio.city, studio.state].filter(Boolean)
        return parts.length > 0 ? parts.join(', ') : 'N/A'
      }
    },
    {
      key: 'contact_email',
      header: 'Email',
      render: (studio: Studio) => studio.contact_email || 'N/A'
    },
    {
      key: 'contact_phone',
      header: 'Phone',
      render: (studio: Studio) => studio.contact_phone || 'N/A'
    },
    {
      key: 'status',
      header: 'Status',
      render: (studio: Studio) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          studio.is_active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {studio.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ]

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Studios</h1>
            <p className="text-gray-600 mt-1">Manage studio locations</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            Add Studio
          </Button>
        </div>
      </div>

      <Table
        data={studios}
        columns={columns}
        loading={loading}
        emptyMessage="No studios found"
      />

      {showAddModal && (
        <AddStudioModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddStudio}
        />
      )}
    </PortalLayout>
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

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Zip Code"
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
            />
          </div>

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
