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

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)

export function StripePaymentDialog({
  isOpen,
  onClose,
  lessonPack,
  instructorId,
}: StripePaymentDialogProps) {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    if (!lessonPack) return
    if (!instructorId) {
      setError('Pick an instructor before purchasing a pack.')
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

  const lessons = lessonPack.lesson_count
  const perLesson = lessonPack.price / lessons

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm purchase" size="md">
      <div className="space-y-7">
        <header className="text-center border-b border-champagne-200 pb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">
            {lessons === 1 ? 'private lesson' : 'private lessons'}
          </p>
          <p className="mt-3 font-serif text-6xl text-charcoal-950 leading-none tracking-[-0.03em] tabular-nums">
            {lessons}
          </p>
          <p className="mt-5 font-serif text-3xl text-charcoal-950 tracking-tight tabular-nums">
            {formatPrice(lessonPack.price)}
          </p>
          <p className="mt-1 text-sm text-charcoal-500 tabular-nums">
            {formatPrice(perLesson)} each
          </p>
        </header>

        <div className="text-sm text-charcoal-500 leading-relaxed text-center max-w-sm mx-auto space-y-2">
          <p>Stripe handles the card details, so we never see them.</p>
          <p>Lessons stay valid for 12 months and pull in the order you bought them.</p>
        </div>

        {!instructorId && (
          <div
            role="alert"
            className="bg-champagne-100 px-4 py-3 text-sm text-charcoal-900"
            style={{ borderLeft: '1px solid var(--color-rose-600)' }}
          >
            Pick an instructor before purchasing a pack.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="bg-champagne-100 px-4 py-3 text-sm text-charcoal-900"
            style={{ borderLeft: '1px solid var(--color-rose-600)' }}
          >
            {error}
          </div>
        )}

        <ModalFooter>
          <Button variant="outline" onClick={onClose} disabled={processing}>
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
                Processing
              </span>
            ) : (
              'Continue to checkout'
            )}
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  )
}
