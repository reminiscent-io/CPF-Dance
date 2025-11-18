'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

interface ProfileData {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  role: string
}

interface StudentData {
  id: string
  goals: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  age_group: string | null
  skill_level: string | null
}

interface GuardianData {
  id: string
  full_name: string
  email: string | null
  phone: string | null
}

export default function DancerProfilePage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [guardianData, setGuardianData] = useState<GuardianData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    goals: '',
    emergency_contact_name: '',
    emergency_contact_phone: ''
  })

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchProfileData()
    }
  }, [loading, user, profile])

  const fetchProfileData = async () => {
    try {
      const response = await fetch('/api/dancer/profile')
      if (response.ok) {
        const data = await response.json()
        setProfileData(data.profile)
        setStudentData(data.student)
        setGuardianData(data.guardian)
        
        setFormData({
          full_name: data.profile.full_name || '',
          phone: data.profile.phone || '',
          date_of_birth: data.profile.date_of_birth || '',
          goals: data.student?.goals || '',
          emergency_contact_name: data.student?.emergency_contact_name || '',
          emergency_contact_phone: data.student?.emergency_contact_phone || ''
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
      const response = await fetch('/api/dancer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            full_name: formData.full_name,
            phone: formData.phone,
            date_of_birth: formData.date_of_birth || null
          },
          student: {
            goals: formData.goals,
            emergency_contact_name: formData.emergency_contact_name,
            emergency_contact_phone: formData.emergency_contact_phone
          }
        })
      })

      if (response.ok) {
        await fetchProfileData()
        setEditing(false)
        setSuccessMessage('Profile updated successfully! 🎉')
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
    if (profileData && studentData) {
      setFormData({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        date_of_birth: profileData.date_of_birth || '',
        goals: studentData.goals || '',
        emergency_contact_name: studentData.emergency_contact_name || '',
        emergency_contact_phone: studentData.emergency_contact_phone || ''
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile ⚙️</h1>
        <p className="text-gray-600">Manage your personal information and dance goals</p>
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
                  helperText="Contact your instructor to change your email"
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

          {studentData && (
            <Card>
              <CardTitle className="p-6 pb-4">Dance Information</CardTitle>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {studentData.age_group && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Age Group
                      </label>
                      <p className="text-gray-900">{studentData.age_group}</p>
                    </div>
                  )}
                  {studentData.skill_level && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Skill Level
                      </label>
                      <p className="text-gray-900">{studentData.skill_level}</p>
                    </div>
                  )}
                </div>
                <Textarea
                  label="Your Dance Goals"
                  placeholder="What do you want to achieve in your dance journey?"
                  rows={4}
                  value={formData.goals}
                  onChange={(e) =>
                    setFormData({ ...formData, goals: e.target.value })
                  }
                  disabled={!editing}
                  helperText="Share your aspirations and what you're working towards"
                />
              </CardContent>
            </Card>
          )}

          {studentData && (
            <Card>
              <CardTitle className="p-6 pb-4">Emergency Contact</CardTitle>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Emergency Contact Name"
                    value={formData.emergency_contact_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_name: e.target.value
                      })
                    }
                    disabled={!editing}
                  />
                  <Input
                    label="Emergency Contact Phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_phone: e.target.value
                      })
                    }
                    disabled={!editing}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {guardianData && (
            <Card>
              <CardTitle className="p-6 pb-4">Guardian Information</CardTitle>
              <CardContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guardian Name
                    </label>
                    <p className="text-gray-900">{guardianData.full_name}</p>
                  </div>
                  {guardianData.email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guardian Email
                      </label>
                      <p className="text-gray-900">{guardianData.email}</p>
                    </div>
                  )}
                  {guardianData.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Guardian Phone
                      </label>
                      <p className="text-gray-900">{guardianData.phone}</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  To update guardian information, please contact your instructor.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardTitle className="p-6 pb-4">Account Security</CardTitle>
            <CardContent className="px-6 pb-6">
              <p className="text-gray-600 mb-4">
                Keep your account secure by using a strong password.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  alert(
                    'Password change functionality coming soon! Please contact your instructor if you need to change your password.'
                  )
                }}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </PortalLayout>
  )
}
