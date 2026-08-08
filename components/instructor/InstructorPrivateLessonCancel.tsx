'use client'

import { useState } from 'react'
import { useNow } from '@/lib/hooks/use-now'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

interface InstructorPrivateLessonCancelProps {
  readonly classId: string
  readonly startTimeIso: string
  readonly onCancelled: () => void
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export function InstructorPrivateLessonCancel({
  classId,
  startTimeIso,
  onCancelled
}: InstructorPrivateLessonCancelProps) {
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [reinstate, setReinstate] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Ticks so the reinstate choice — and the payload it feeds — stay honest in a
  // tab left open across the boundary.
  const now = useNow()
  const insideWindow = new Date(startTimeIso).getTime() - now.getTime() < TWENTY_FOUR_HOURS_MS

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/classes/${classId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim() || null,
          reinstate_credit: insideWindow ? reinstate : true
        })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to cancel')
      }
      const data = await response.json()
      const message = data.creditOutcome === 'refunded'
        ? 'Lesson cancelled. Credit refunded to dancer.'
        : data.creditOutcome === 'forfeited'
        ? 'Lesson cancelled. Credit forfeited.'
        : 'Lesson cancelled.'
      addToast(message, 'success')
      setOpen(false)
      setReason('')
      setReinstate(false)
      onCancelled()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel'
      addToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setReason('')
          setReinstate(false)
          setOpen(true)
        }}
        className="border-rose-300 text-rose-700 hover:bg-rose-50 w-full"
      >
        Cancel Private Lesson
      </Button>

      <Modal isOpen={open} onClose={() => !submitting && setOpen(false)} title="Cancel this private lesson?">
        <div className="space-y-4">
          {insideWindow ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-charcoal-900">
              <strong>Inside 24 hours.</strong> By default, the dancer’s credit is forfeited. You can choose to reinstate it.
            </div>
          ) : (
            <p className="text-sm text-charcoal-700">
              Outside 24 hours: the dancer’s credit will be refunded to their pack automatically.
            </p>
          )}

          <Textarea
            label="Reason (optional)"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Shared in the cancellation email"
          />

          {insideWindow && (
            <label className="flex items-start gap-2 cursor-pointer p-3 bg-champagne-50 rounded-lg">
              <input
                type="checkbox"
                checked={reinstate}
                onChange={(e) => setReinstate(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-charcoal-900">
                Reinstate the dancer’s credit to their pack.
              </span>
            </label>
          )}
        </div>
        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Keep lesson
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {submitting ? 'Cancelling…' : 'Cancel lesson'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
