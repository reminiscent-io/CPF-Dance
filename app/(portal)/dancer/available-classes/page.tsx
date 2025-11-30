'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

const PENDING_EXTERNAL_SIGNUP_KEY = 'pending_external_signup'

interface PublicClass {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  class_type: string
  max_capacity: number | null
  pricing_model: string
  cost_per_person: number | null
  base_cost: number | null
  external_signup_url: string | null
  enrolled_count: number
  studio: {
    name: string
    city: string | null
    state: string | null
  } | null
  instructor: {
    full_name: string
  }
}

export default function AvailableClassesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  const [classes, setClasses] = useState<PublicClass[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<PublicClass | null>(null)
  const [showExternalSignupModal, setShowExternalSignupModal] = useState(false)
  const [pendingExternalClass, setPendingExternalClass] = useState<PublicClass | null>(null)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchPublicClasses()
      // Check for pending external signup when page loads or regains focus
      checkForPendingExternalSignup()
      window.addEventListener('focus', checkForPendingExternalSignup)
      return () => window.removeEventListener('focus', checkForPendingExternalSignup)
    }
  }, [loading, user, profile])

  const checkForPendingExternalSignup = () => {
    try {
      const pendingSignup = sessionStorage.getItem(PENDING_EXTERNAL_SIGNUP_KEY)
      if (pendingSignup) {
        const classData = JSON.parse(pendingSignup) as PublicClass
        setPendingExternalClass(classData)
        setShowExternalSignupModal(true)
        // Don't remove from sessionStorage yet - only remove after user confirms/cancels
      }
    } catch (error) {
      console.error('Error checking for pending signup:', error)
    }
  }

  const fetchPublicClasses = async () => {
    try {
      setLoadingClasses(true)
      const response = await fetch('/api/dancer/public-classes')

      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes || [])
      } else {
        addToast('Failed to load available classes', 'error')
      }
    } catch (error) {
      console.error('Error fetching public classes:', error)
      addToast('Error loading classes', 'error')
    } finally {
      setLoadingClasses(false)
    }
  }

  const handleEnrollClick = (cls: PublicClass) => {
    if (cls.external_signup_url) {
      // Store class info and open external URL
      sessionStorage.setItem(PENDING_EXTERNAL_SIGNUP_KEY, JSON.stringify(cls))
      window.open(cls.external_signup_url, '_blank', 'noopener,noreferrer')
    } else {
      // Show internal enrollment modal
      setSelectedClass(cls)
      setShowEnrollModal(true)
    }
  }

  const handleEnroll = async () => {
    if (!selectedClass) return

    try {
      setEnrollingClassId(selectedClass.id)
      const response = await fetch('/api/dancer/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClass.id })
      })

      if (response.ok) {
        addToast('Successfully enrolled in class!', 'success')
        setShowEnrollModal(false)
        fetchPublicClasses() // Refresh the list
        router.push('/dancer/classes') // Redirect to enrolled classes
      } else {
        const data = await response.json()
        addToast(data.error || 'Failed to enroll in class', 'error')
      }
    } catch (error) {
      console.error('Error enrolling:', error)
      addToast('Error enrolling in class', 'error')
    } finally {
      setEnrollingClassId(null)
    }
  }

  const handleAddExternalClassToCalendar = async () => {
    if (!pendingExternalClass) return

    try {
      setEnrollingClassId(pendingExternalClass.id)
      const response = await fetch('/api/dancer/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: pendingExternalClass.id })
      })

      if (response.ok) {
        addToast('Class added to your calendar!', 'success')
        setShowExternalSignupModal(false)
        sessionStorage.removeItem(PENDING_EXTERNAL_SIGNUP_KEY)
        setPendingExternalClass(null)
        fetchPublicClasses() // Refresh the list
      } else {
        const data = await response.json()
        addToast(data.error || 'Failed to add class to calendar', 'error')
      }
    } catch (error) {
      console.error('Error adding to calendar:', error)
      addToast('Error adding class to calendar', 'error')
    } finally {
      setEnrollingClassId(null)
    }
  }

  const handleCancelExternalSignup = () => {
    setShowExternalSignupModal(false)
    sessionStorage.removeItem(PENDING_EXTERNAL_SIGNUP_KEY)
    setPendingExternalClass(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatClassType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatPrice = (cls: PublicClass) => {
    if (cls.pricing_model === 'per_person' && cls.cost_per_person) {
      return `$${cls.cost_per_person.toFixed(2)} per person`
    } else if (cls.pricing_model === 'per_class' && cls.base_cost) {
      return `$${cls.base_cost.toFixed(2)} per class`
    } else if (cls.pricing_model === 'per_hour' && cls.cost_per_person) {
      return `$${cls.cost_per_person.toFixed(2)} per hour`
    }
    return 'Contact instructor'
  }

  const isClassFull = (cls: PublicClass) => {
    return cls.max_capacity ? cls.enrolled_count >= cls.max_capacity : false
  }

  const upcomingClasses = classes.filter(cls => new Date(cls.start_time) > new Date())

  if (loading || loadingClasses) {
    return (
      <PortalLayout profile={profile}>
        <div className="flex items-center justify-center min-h-96">
          <Spinner size="lg" />
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout profile={profile}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Available Classes</h1>
          <p className="text-gray-600">
            Browse and enroll in upcoming public classes
          </p>
        </div>

        {upcomingClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingClasses.map(cls => (
              <Card key={cls.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{cls.title}</h3>
                    <Badge variant={cls.class_type === 'private' ? 'warning' : 'default'}>
                      {formatClassType(cls.class_type)}
                    </Badge>
                  </div>

                  {cls.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {cls.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-gray-700 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Instructor:</span>
                      <span>{cls.instructor.full_name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(cls.start_time)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-medium">Time:</span>
                      <span>{formatTime(cls.start_time)} - {formatTime(cls.end_time)}</span>
                    </div>

                    {cls.location && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Location:</span>
                        <span className="truncate">{cls.location}</span>
                      </div>
                    )}

                    {cls.studio && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Studio:</span>
                        <span>{cls.studio.name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="font-medium">Price:</span>
                      <span>{formatPrice(cls)}</span>
                    </div>

                    {cls.max_capacity && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Capacity:</span>
                        <span>
                          {cls.enrolled_count} / {cls.max_capacity}
                          {isClassFull(cls) && ' (Full)'}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleEnrollClick(cls)}
                    disabled={isClassFull(cls)}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {cls.external_signup_url ? 'Sign Up' : 'Enroll Now'}
                      {cls.external_signup_url && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      )}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🩰</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Classes Available
              </h3>
              <p className="text-gray-600">
                There are no public classes available at this time. Check back later!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enrollment Confirmation Modal */}
      <Modal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Confirm Enrollment"
        size="md"
      >
        {selectedClass && (
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to enroll in <strong>{selectedClass.title}</strong>?
            </p>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formatDate(selectedClass.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">
                  {formatTime(selectedClass.start_time)} - {formatTime(selectedClass.end_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium">{formatPrice(selectedClass)}</span>
              </div>
            </div>
          </div>
        )}

        <ModalFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => setShowEnrollModal(false)}
            disabled={enrollingClassId !== null}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnroll}
            disabled={enrollingClassId !== null}
          >
            {enrollingClassId ? 'Enrolling...' : 'Confirm Enrollment'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* External Signup Confirmation Modal */}
      <Modal
        isOpen={showExternalSignupModal}
        onClose={handleCancelExternalSignup}
        title="Add Class to Calendar"
        size="md"
      >
        {pendingExternalClass && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-900 font-medium">
                ✓ Great! Did you complete the signup for <strong>{pendingExternalClass.title}</strong>?
              </p>
            </div>

            <p className="text-gray-700">
              If you've signed up through the external portal, click "Add to Calendar" to track this class in your schedule.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">{formatDate(pendingExternalClass.start_time)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">
                  {formatTime(pendingExternalClass.start_time)} - {formatTime(pendingExternalClass.end_time)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Instructor:</span>
                <span className="font-medium">{pendingExternalClass.instructor.full_name}</span>
              </div>
            </div>
          </div>
        )}

        <ModalFooter className="mt-6">
          <Button
            variant="outline"
            onClick={handleCancelExternalSignup}
            disabled={enrollingClassId !== null}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddExternalClassToCalendar}
            disabled={enrollingClassId !== null}
          >
            {enrollingClassId ? 'Adding...' : 'Add to Calendar'}
          </Button>
        </ModalFooter>
      </Modal>
    </PortalLayout>
  )
}
