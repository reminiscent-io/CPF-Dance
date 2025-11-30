'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

interface Waiver {
  id: string
  title: string
  description: string | null
  content: string
  waiver_type: string
  status: string
  recipient_id: string | null
  student_id: string | null
  recipient_type: string
  issued_by_id: string
  signed_at: string | null
  created_at: string
  expires_at: string | null
  declined_reason: string | null
  signature_image_url: string | null
  waiver_signatures?: Array<{
    signer_name: string
    signer_email: string
    signed_at: string
  }>
}

export default function WaiverDetailPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const params = useParams()
  const [waiver, setWaiver] = useState<Waiver | null>(null)
  const [loadingWaiver, setLoadingWaiver] = useState(true)
  const [recipientInfo, setRecipientInfo] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

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
        setWaiver(data.waiver)

        // Fetch recipient info
        if (data.waiver.student_id) {
          fetchStudentInfo(data.waiver.student_id)
        } else if (data.waiver.recipient_id) {
          fetchRecipientProfile(data.waiver.recipient_id)
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

  const fetchStudentInfo = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}`)
      if (response.ok) {
        const data = await response.json()
        const student = data.student
        const profile = Array.isArray(student.profile) ? student.profile[0] : student.profile
        setRecipientInfo({
          name: profile?.full_name || student.full_name || 'Unknown Student',
          email: profile?.email || student.email || 'No email',
          phone: profile?.phone || student.phone || 'No phone'
        })
      }
    } catch (error) {
      console.error('Error fetching student:', error)
    }
  }

  const fetchRecipientProfile = async (profileId: string) => {
    try {
      const response = await fetch(`/api/profiles?id=${profileId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setRecipientInfo({
            name: data.profile.full_name || 'Unknown',
            email: data.profile.email || 'No email',
            phone: data.profile.phone || 'No phone'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleDelete = async () => {
    if (!waiver) return

    if (!confirm('Are you sure you want to delete this waiver? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/waivers/${waiver.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Waiver deleted successfully')
        router.push('/instructor/waivers')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete waiver')
      }
    } catch (error) {
      console.error('Error deleting waiver:', error)
      alert('An error occurred while deleting the waiver')
    } finally {
      setDeleting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'declined':
        return 'danger'
      case 'expired':
        return 'default'
      default:
        return 'default'
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

  const isPending = waiver.status === 'pending'
  const isSigned = waiver.status === 'signed'
  const signature = waiver.waiver_signatures?.[0]

  return (
    <PortalLayout profile={profile}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/instructor/waivers')}
            className="mb-4"
          >
            ← Back to Waivers
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{waiver.title}</h1>
              {waiver.description && (
                <p className="text-gray-600">{waiver.description}</p>
              )}
            </div>
            <Badge variant={getStatusColor(waiver.status)} className="text-lg px-4 py-2">
              {waiver.status}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        {isPending && (
          <Card className="mb-6">
            <CardTitle>Actions</CardTitle>
            <CardContent className="mt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/instructor/waivers/${waiver.id}/edit`)}
                >
                  ✏️ Edit Waiver
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : '🗑️ Delete Waiver'}
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                This waiver can be edited or deleted because it hasn't been signed yet.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Waiver Info */}
        <Card className="mb-6">
          <CardTitle>Waiver Information</CardTitle>
          <CardContent className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <p className="text-gray-900 capitalize">{waiver.waiver_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Recipient Type</label>
                <p className="text-gray-900 capitalize">{waiver.recipient_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Issued</label>
                <p className="text-gray-900">
                  {new Date(waiver.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {waiver.expires_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Expires</label>
                  <p className="text-gray-900">
                    {new Date(waiver.expires_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recipient Info */}
        {recipientInfo && (
          <Card className="mb-6">
            <CardTitle>Recipient</CardTitle>
            <CardContent className="mt-4">
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-gray-900">{recipientInfo.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{recipientInfo.email}</p>
                </div>
                {recipientInfo.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-gray-900">{recipientInfo.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Info */}
        {isSigned && signature && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardTitle className="text-green-900">✓ Signed</CardTitle>
            <CardContent className="mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-green-900">Signed By</label>
                  <p className="text-green-800">{signature.signer_name}</p>
                  <p className="text-sm text-green-700">{signature.signer_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-green-900">Signed At</label>
                  <p className="text-green-800">
                    {new Date(signature.signed_at).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {waiver.signature_image_url && (
                  <div>
                    <label className="text-sm font-medium text-green-900">Signature</label>
                    <div className="mt-2 border-2 border-green-300 rounded-lg p-4 bg-white inline-block">
                      <img
                        src={waiver.signature_image_url}
                        alt="Signature"
                        className="max-w-xs h-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Declined Info */}
        {waiver.status === 'declined' && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardTitle className="text-red-900">✗ Declined</CardTitle>
            <CardContent className="mt-4">
              {waiver.declined_reason && (
                <div>
                  <label className="text-sm font-medium text-red-900">Reason</label>
                  <p className="text-red-800">{waiver.declined_reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Waiver Content */}
        <Card>
          <CardTitle>Waiver Content</CardTitle>
          <CardContent className="mt-4">
            <div
              className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200"
              dangerouslySetInnerHTML={{ __html: waiver.content }}
            />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
