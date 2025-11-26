'use client'

import { useState } from 'react'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

interface LessonPack {
  id: string
  lesson_count: number
  price: number
  name?: string
}

interface StripePaymentDialogProps {
  isOpen: boolean
  onClose: () => void
  lessonPack: LessonPack | null
  instructorId: string | null
  onSuccess?: () => void
}

export function StripePaymentDialog({
  isOpen,
  onClose,
  lessonPack,
  instructorId,
  onSuccess
}: StripePaymentDialogProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const handleCheckout = async () => {
    if (!lessonPack) return

    if (!instructorId) {
      setError('Please select an instructor before purchasing a lesson pack')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_pack_id: lessonPack.id,
          instructor_id: instructorId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err: any) {
      console.error('Checkout error:', err)
      setError(err.message || 'Failed to start checkout')
      setProcessing(false)
    }
  }

  if (!lessonPack) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Your Purchase" size="md">
      <div className="space-y-6">
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {lessonPack.lesson_count} Private Lessons
            </h3>
            <p className="text-4xl font-bold text-rose-600 mb-2">
              {formatPrice(lessonPack.price)}
            </p>
            <p className="text-sm text-gray-600">
              {formatPrice(lessonPack.price / lessonPack.lesson_count)} per lesson
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {!instructorId && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            Please select an instructor before purchasing a lesson pack
          </div>
        )}

        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Secure payment processing through Stripe</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Use lessons anytime with your selected instructor</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">✓</span>
            <span>Track your remaining lessons in the dashboard</span>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCheckout}
            disabled={processing || !instructorId}
          >
            {processing ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                Processing...
              </span>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
