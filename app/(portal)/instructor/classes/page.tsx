'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, Button, Badge, Modal, ModalFooter, Input, Textarea, useToast, Spinner } from '@/components/ui'
import type { Class, Studio, CreateClassData, ClassType } from '@/lib/types'

export default function ClassesPage() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  
  const [classes, setClasses] = useState<Class[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filterStudio, setFilterStudio] = useState<string>('')
  const [filterType, setFilterType] = useState<ClassType | ''>('')
  const [upcomingOnly, setUpcomingOnly] = useState(true)

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor') {
      router.push(`/${profile.role === 'studio_admin' ? 'studio' : 'dancer'}`)
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (user) {
      fetchClasses()
      fetchStudios()
    }
  }, [user, filterStudio, filterType, upcomingOnly])

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams()
      if (filterStudio) params.append('studio_id', filterStudio)
      if (filterType) params.append('class_type', filterType)
      if (upcomingOnly) params.append('upcoming', 'true')
      
      const response = await fetch(`/api/classes?${params}`)
      if (!response.ok) throw new Error('Failed to fetch classes')
      
      const data = await response.json()
      setClasses(data.classes || [])
    } catch (error) {
      console.error('Error fetching classes:', error)
      addToast('Failed to load classes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudios = async () => {
    try {
      const response = await fetch('/api/studios?is_active=true')
      if (!response.ok) throw new Error('Failed to fetch studios')
      
      const data = await response.json()
      setStudios(data.studios || [])
    } catch (error) {
      console.error('Error fetching studios:', error)
    }
  }

  const handleCreateClass = async (formData: CreateClassData) => {
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to create class')
      }

      const { class: newClass } = await response.json()
      setClasses(prev => [newClass, ...prev])
      setShowCreateModal(false)
      addToast('Class created successfully', 'success')
    } catch (error) {
      console.error('Error creating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class'
      addToast(errorMessage, 'error')
    }
  }

  if (authLoading || !profile || profile.role !== 'instructor') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-600 mt-1">Manage your class schedule</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Class
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            value={filterStudio}
            onChange={(e) => setFilterStudio(e.target.value)}
          >
            <option value="">All Studios</option>
            {studios.map(studio => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>

          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ClassType | '')}
          >
            <option value="">All Types</option>
            <option value="group">Group</option>
            <option value="private">Private</option>
            <option value="workshop">Workshop</option>
            <option value="master_class">Master Class</option>
          </select>

          <Button
            variant={upcomingOnly ? 'primary' : 'outline'}
            onClick={() => setUpcomingOnly(!upcomingOnly)}
          >
            {upcomingOnly ? 'Upcoming Only' : 'All Classes'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : classes.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-600">
            No classes found
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls: any) => (
            <Card 
              key={cls.id} 
              hover
              className="cursor-pointer"
              onClick={() => router.push(`/instructor/classes/${cls.id}`)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex-1">{cls.title}</h3>
                {cls.is_cancelled ? (
                  <Badge variant="danger">Cancelled</Badge>
                ) : (
                  <Badge variant="primary">{cls.class_type.replace('_', ' ')}</Badge>
                )}
              </div>

              {cls.studio && (
                <p className="text-sm text-gray-600 mb-2">
                  📍 {cls.studio.name}
                  {cls.studio.city && `, ${cls.studio.city}`}
                </p>
              )}

              <p className="text-sm text-gray-600 mb-3">
                📅 {new Date(cls.start_time).toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>

              {cls.description && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{cls.description}</p>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="text-sm text-gray-600">
                  {cls.enrolled_count || 0}
                  {cls.max_capacity && ` / ${cls.max_capacity}`} enrolled
                </span>
                {cls.price && (
                  <span className="text-sm font-semibold text-gray-900">${cls.price}</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateClassModal
          studios={studios}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateClass}
        />
      )}
    </PortalLayout>
  )
}

interface CreateClassModalProps {
  studios: Studio[]
  onClose: () => void
  onSubmit: (data: CreateClassData) => void
}

function CreateClassModal({ studios, onClose, onSubmit }: CreateClassModalProps) {
  const [formData, setFormData] = useState<CreateClassData>({
    studio_id: '',
    class_type: 'group',
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    max_capacity: undefined,
    price: undefined
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.start_time || !formData.end_time) {
      return
    }
    onSubmit(formData)
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Class" size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <Input
            label="Class Title *"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <Textarea
            label="Description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Studio
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={formData.studio_id}
                onChange={(e) => setFormData({ ...formData, studio_id: e.target.value })}
              >
                <option value="">Select a studio</option>
                {studios.map(studio => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class Type *
              </label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                value={formData.class_type}
                onChange={(e) => setFormData({ ...formData, class_type: e.target.value as ClassType })}
              >
                <option value="group">Group</option>
                <option value="private">Private</option>
                <option value="workshop">Workshop</option>
                <option value="master_class">Master Class</option>
              </select>
            </div>
          </div>

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time *"
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <Input
              label="End Time *"
              type="datetime-local"
              required
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Max Capacity"
              type="number"
              min="1"
              value={formData.max_capacity || ''}
              onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value ? parseInt(e.target.value) : undefined })}
            />
            <Input
              label="Price ($)"
              type="number"
              min="0"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
        </div>

        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Class</Button>
        </ModalFooter>
      </form>
    </Modal>
  )
}
