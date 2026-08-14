'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton } from '@/components/ui/Skeleton'
import { StatusDot } from '@/components/ui/StatusDot'
import type { StatusTone } from '@/components/ui/StatusDot'
import { createSanitizedHtml } from '@/lib/utils/sanitize'

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
      router.push('/dancer')
    }
  }, [loading, profile, router])

  useEffect(() => {
    const waiverId = params?.id
    if (loading || !user || !waiverId) return
    let cancelled = false

    const fetchStudentInfo = async (studentId: string) => {
      try {
        const response = await fetch(`/api/students/${studentId}`)
        if (response.ok) {
          const data = await response.json()
          const student = data.student
          const studentProfile = Array.isArray(student.profile) ? student.profile[0] : student.profile
          if (cancelled) return
          setRecipientInfo({
            name: studentProfile?.full_name || student.full_name || 'Unknown Student',
            email: studentProfile?.email || student.email || 'No email',
            phone: studentProfile?.phone || student.phone || 'No phone'
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
          if (data.profile && !cancelled) {
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

    const fetchWaiver = async () => {
      try {
        const response = await fetch(`/api/waivers/${waiverId}`)
        if (cancelled) return

        if (response.ok) {
          const data = await response.json()
          if (cancelled) return
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
        if (!cancelled) setLoadingWaiver(false)
      }
    }

    fetchWaiver()
    return () => { cancelled = true }
  }, [loading, user, params?.id, router])

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

  const getStatusTone = (status: string): StatusTone => {
    switch (status) {
      case 'signed':
        return 'positive'
      case 'declined':
      case 'expired':
        return 'attention'
      case 'pending':
      default:
        return 'neutral'
    }
  }

  if (loading || loadingWaiver) {
    return (
      <PortalLayout profile={profile}>
        <PageSkeleton variant="detail" withAction />
      </PortalLayout>
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
        <Button
          variant="ghost"
          onClick={() => router.push('/instructor/waivers')}
          className="mb-4"
        >
          ← Back to Waivers
        </Button>

        <PageHeader
          title={waiver.title}
          subtitle={waiver.description || 'Review this waiver and its signature status.'}
          action={
            <div className="flex items-center gap-3">
              <StatusDot tone={getStatusTone(waiver.status)} label={waiver.status} className="capitalize" />
              {isPending && (
                <Button
                  onClick={() => router.push(`/instructor/waivers/${waiver.id}/edit`)}
                >
                  Edit Waiver
                </Button>
              )}
            </div>
          }
        />

        <div className="mt-header-gap space-y-6">
        {/* Actions */}
        {isPending && (
          <Card>
            <CardTitle>Actions</CardTitle>
            <CardContent className="mt-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/instructor/waivers/${waiver.id}/edit`)}
                >
                  Edit Waiver
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete Waiver'}
                </Button>
              </div>
              <p className="text-sm text-charcoal-500 mt-3">
                This waiver can be edited or deleted because it hasn’t been signed yet.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Waiver Info */}
        <Card>
          <CardTitle>Waiver Information</CardTitle>
          <CardContent className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-charcoal-700">Type</label>
                <p className="text-charcoal-950 capitalize">{waiver.waiver_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-charcoal-700">Recipient Type</label>
                <p className="text-charcoal-950 capitalize">{waiver.recipient_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-charcoal-700">Issued</label>
                <p className="text-charcoal-950">
                  {new Date(waiver.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              {waiver.expires_at && (
                <div>
                  <label className="text-sm font-medium text-charcoal-700">Expires</label>
                  <p className="text-charcoal-950">
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
          <Card>
            <CardTitle>Recipient</CardTitle>
            <CardContent className="mt-4">
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-charcoal-700">Name</label>
                  <p className="text-charcoal-950">{recipientInfo.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-charcoal-700">Email</label>
                  <p className="text-charcoal-950">{recipientInfo.email}</p>
                </div>
                {recipientInfo.phone && (
                  <div>
                    <label className="text-sm font-medium text-charcoal-700">Phone</label>
                    <p className="text-charcoal-950">{recipientInfo.phone}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signature Info */}
        {isSigned && signature && (
          <Card>
            <CardTitle>
              <StatusDot tone="positive" label="Signed" />
            </CardTitle>
            <CardContent className="mt-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-charcoal-700">Signed By</label>
                  <p className="text-charcoal-950">{signature.signer_name}</p>
                  <p className="text-sm text-charcoal-500">{signature.signer_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-charcoal-700">Signed At</label>
                  <p className="text-charcoal-950">
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
                    <label className="text-sm font-medium text-charcoal-700">Signature</label>
                    <div className="mt-2 border border-champagne-200 rounded-lg p-4 bg-champagne-50 inline-block">
                      <Image
                        src={waiver.signature_image_url}
                        alt="Signature"
                        className="max-w-xs h-auto rounded-lg"
                        width={600}
                        height={200}
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
          <Card>
            <CardTitle>
              <StatusDot tone="attention" label="Declined" />
            </CardTitle>
            <CardContent className="mt-4">
              {waiver.declined_reason && (
                <div>
                  <label className="text-sm font-medium text-charcoal-700">Reason</label>
                  <p className="text-charcoal-950">{waiver.declined_reason}</p>
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
              className="prose prose-sm max-w-none bg-champagne-100 p-6 rounded-lg border border-champagne-200"
              dangerouslySetInnerHTML={createSanitizedHtml(waiver.content)}
            />
          </CardContent>
        </Card>
        </div>
      </div>
    </PortalLayout>
  )
}
