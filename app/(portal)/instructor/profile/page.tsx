'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { signOut } from '@/lib/auth/actions'

interface ProfileData {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  role: string
}

export default function InstructorProfilePage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: ''
  })

  useEffect(() => {
    if (!loading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchProfileData()
    }
  }, [loading, user, profile])

  const fetchProfileData = async () => {
    try {
      const response = await fetch('/api/instructor/profile')
      if (response.ok) {
        const data = await response.json()
        setProfileData(data.profile)

        setFormData({
          full_name: data.profile.full_name || '',
          phone: data.profile.phone || '',
          date_of_birth: data.profile.date_of_birth || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/instructor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null
        })
      })

      if (response.ok) {
        await fetchProfileData()
        setEditing(false)
        setSuccessMessage('Profile updated successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (profileData) {
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        date_of_birth: profileData.date_of_birth || ''
      })
    }
    setEditing(false)
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

  if (!user || !profile) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-family-display)' }}>My Profile</h1>
        <p className="text-gray-600">Manage your personal information</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}

      {loadingData ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardTitle className="p-6 pb-4 flex items-center justify-between">
              <span>Personal Information</span>
              {!editing && (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </CardTitle>
            <CardContent className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  disabled={!editing}
                />
                <Input
                  label="Email"
                  value={profileData?.email || 'Not provided'}
                  disabled
                  helperText="Contact support to change your email"
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  disabled={!editing}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    setFormData({ ...formData, date_of_birth: e.target.value })
                  }
                  disabled={!editing}
                />
              </div>

              {editing && (
                <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardTitle className="p-6 pb-4">Account Security</CardTitle>
            <CardContent className="px-6 pb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Password</p>
                  <p className="text-gray-600 mb-3">
                    Keep your account secure by using a strong password.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      alert(
                        'Password change functionality coming soon! Please contact support if you need to change your password.'
                      )
                    }}
                  >
                    Change Password
                  </Button>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Sign Out</p>
                  <p className="text-gray-600 mb-3">
                    Sign out of your account on this device.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await signOut()
                    }}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PortalLayout>
  )
}
