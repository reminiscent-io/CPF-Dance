'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageSkeleton, SkeletonDetail } from '@/components/ui'
import { PageHeader } from '@/components/ui/PageHeader'
import { CheckIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { HeadshotUpload } from '@/components/HeadshotUpload'
import { signOut } from '@/lib/auth/actions'

interface ProfileData {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  avatar_url: string | null
  role: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function InstructorProfilePage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    date_of_birth: ''
  })

  // Track if this is initial load vs user edit
  const isInitialLoad = useRef(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      // Mark initial load complete after a short delay
      setTimeout(() => {
        isInitialLoad.current = false
      }, 100)
    }
  }

  const saveProfile = useCallback(async (data: typeof formData) => {
    setSaveStatus('saving')
    try {
      const response = await fetch('/api/instructor/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: data.full_name,
          phone: data.phone,
          date_of_birth: data.date_of_birth || null
        })
      })

      if (response.ok) {
        setSaveStatus('saved')
        // Clear "Saved" status after 2 seconds
        if (statusTimeoutRef.current) {
          clearTimeout(statusTimeoutRef.current)
        }
        statusTimeoutRef.current = setTimeout(() => {
          setSaveStatus('idle')
        }, 2000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setSaveStatus('error')
    }
  }, [])

  // Auto-save with debounce when form data changes
  useEffect(() => {
    // Skip auto-save on initial load
    if (isInitialLoad.current || loadingData) {
      return
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce save by 800ms
    saveTimeoutRef.current = setTimeout(() => {
      saveProfile(formData)
    }, 800)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [formData, loadingData, saveProfile])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current)
    }
  }, [])

  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <PortalLayout profile={profile}>
        <PageSkeleton variant="detail" withAction />
      </PortalLayout>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal information"
        action={
          <div className="flex items-center gap-1.5 text-sm">
            {saveStatus === 'saving' && (
              <span className="text-charcoal-500 flex items-center gap-1.5">
                <ArrowPathIcon className="animate-spin h-4 w-4" aria-hidden="true" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-gold-700 flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4" aria-hidden="true" />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-rose-700 flex items-center gap-1.5">
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                Error saving
              </span>
            )}
          </div>
        }
      />

      {loadingData ? (
        <div className="mt-header-gap">
          <SkeletonDetail />
        </div>
      ) : (
        <div className="mt-header-gap space-y-6">
          {/* Headshot Section */}
          <Card>
            <CardTitle className="p-4 md:p-6 pb-2 md:pb-4">Profile Photo</CardTitle>
            <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
              <HeadshotUpload
                userId={profileData?.id || ''}
                currentUrl={profileData?.avatar_url || null}
                userName={profileData?.full_name || 'User'}
                onUploadComplete={(url) => {
                  if (profileData) {
                    setProfileData({ ...profileData, avatar_url: url })
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardTitle className="p-4 md:p-6 pb-2 md:pb-4">Personal Information</CardTitle>
            <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={formData.full_name}
                  onChange={(e) => handleFieldChange('full_name', e.target.value)}
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
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardTitle className="p-4 md:p-6 pb-2 md:pb-4">Account Security</CardTitle>
            <CardContent className="px-4 md:px-6 pb-4 md:pb-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-charcoal-700 mb-2">Password</p>
                  <p className="text-charcoal-500 mb-3">
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

                <div className="border-t border-champagne-200 pt-4">
                  <p className="text-sm font-medium text-charcoal-700 mb-2">Sign Out</p>
                  <p className="text-charcoal-500 mb-3">
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
