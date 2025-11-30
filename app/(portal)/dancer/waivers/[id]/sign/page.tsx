'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SignaturePad } from '@/components/SignaturePad'

interface Waiver {
  id: string
  title: string
  description: string
  content: string
  status: string
}

export default function SignWaiverPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const params = useParams()
  const [waiver, setWaiver] = useState<Waiver | null>(null)
  const [loadingWaiver, setLoadingWaiver] = useState(true)
  const [signature, setSignature] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
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
      } else {
        router.push('/dancer/waivers')
      }
    } catch (error) {
      console.error('Error fetching waiver:', error)
    } finally {
      setLoadingWaiver(false)
    }
  }

  const handleSignWaiver = async () => {
    if (!signature || !agreeToTerms || !waiver || !params?.id) {
      alert('Please sign the waiver and agree to the terms')
      return
    }

    setSigning(true)
    try {
      const response = await fetch(`/api/waivers/${params.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_image: signature,
          signer_name: profile?.full_name,
          signer_email: user?.email
        })
      })

      if (response.ok) {
        alert('Waiver signed successfully!')
        router.push('/dancer/waivers')
      } else {
        alert('Failed to sign waiver')
      }
    } catch (error) {
      console.error('Error signing waiver:', error)
      alert('An error occurred while signing the waiver')
    } finally {
      setSigning(false)
    }
  }

  const handleDecline = async () => {
    if (!confirm('Are you sure you want to decline this waiver?')) return
    if (!params?.id) return

    try {
      const response = await fetch(`/api/waivers/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'declined',
          declined_reason: 'User declined to sign'
        })
      })

      if (response.ok) {
        alert('Waiver declined')
        router.push('/dancer/waivers')
      }
    } catch (error) {
      console.error('Error declining waiver:', error)
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
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{waiver.title}</h1>
          <p className="text-gray-600">{waiver.description}</p>
        </div>

        <Card className="mb-6">
          <CardTitle>Waiver Terms</CardTitle>
          <CardContent className="mt-4">
            <div className="prose prose-sm max-w-none bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6 max-h-64 overflow-y-auto">
              <div className="text-gray-700 whitespace-pre-wrap">{waiver.content}</div>
            </div>

            <label className="flex items-start gap-3 mb-6">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-2 focus:ring-rose-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the terms stated in this waiver. I understand the risks and release the instructor and studio from liability.
              </span>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardTitle>Sign Here</CardTitle>
          <CardContent className="mt-4">
            <SignaturePad onSave={setSignature} />
          </CardContent>
        </Card>

        <div className="mt-8 flex gap-4">
          <Button
            onClick={handleSignWaiver}
            disabled={signing || !signature || !agreeToTerms}
            size="lg"
            className="flex-1"
          >
            {signing ? 'Signing...' : 'Sign & Submit'}
          </Button>
          <Button
            onClick={handleDecline}
            variant="outline"
            size="lg"
            className="flex-1"
          >
            Decline
          </Button>
        </div>
      </div>
    </PortalLayout>
  )
}
