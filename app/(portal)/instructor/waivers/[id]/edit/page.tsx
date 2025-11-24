'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Waiver {
  id: string
  title: string
  description: string | null
  status: string
  expires_at: string | null
}

export default function EditWaiverPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const params = useParams()
  const [waiver, setWaiver] = useState<Waiver | null>(null)
  const [loadingWaiver, setLoadingWaiver] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (!loading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'studio' ? 'studio' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && params?.id) {
      fetchWaiver()
    }
  }, [loading, user, params?.id])

  const fetchWaiver = async () => {
    if (!params?.id) return

    try {
      const response = await fetch(`/api/waivers/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        const waiverData = data.waiver

        // Check if waiver can be edited
        if (waiverData.status !== 'pending') {
          alert('Only pending waivers can be edited')
          router.push(`/instructor/waivers/${params.id}`)
          return
        }

        setWaiver(waiverData)
        setTitle(waiverData.title)
        setDescription(waiverData.description || '')

        // Format date for input (YYYY-MM-DD)
        if (waiverData.expires_at) {
          const date = new Date(waiverData.expires_at)
          setExpiresAt(date.toISOString().split('T')[0])
        }
      } else {
        router.push('/instructor/waivers')
      }
    } catch (error) {
      console.error('Error fetching waiver:', error)
    } finally {
      setLoadingWaiver(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/waivers/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      })

      if (response.ok) {
        alert('Waiver updated successfully')
        router.push(`/instructor/waivers/${params?.id}`)
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to update waiver')
      }
    } catch (error) {
      console.error('Error updating waiver:', error)
      alert('An error occurred while updating the waiver')
    } finally {
      setSaving(false)
    }
  }

  if (loading || loadingWaiver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user || !profile || !waiver) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push(`/instructor/waivers/${params?.id}`)}
            className="mb-4"
          >
            ← Back to Waiver
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Waiver</h1>
          <p className="text-gray-600">Update waiver details before it's signed</p>
        </div>

        <Card>
          <CardTitle>Waiver Details</CardTitle>
          <CardContent className="mt-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., General Liability Waiver"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date (Optional)
                </label>
                <Input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no expiration
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> You can only edit the title, description, and expiration date.
                  The waiver content cannot be changed after issuance to maintain legal integrity.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/instructor/waivers/${params?.id}`)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
