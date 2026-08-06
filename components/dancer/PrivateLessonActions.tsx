'use client'

import { useState } from 'react'
import { useNow } from '@/lib/hooks/use-now'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea, Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

interface PrivateLessonActionsProps {
  readonly classId: string
  readonly startTimeIso: string
  readonly onCancelled: () => void
  readonly onRescheduleRequested: () => void
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export function PrivateLessonActions({
  classId,
  startTimeIso,
  onCancelled,
  onRescheduleRequested
}: PrivateLessonActionsProps) {
  const { addToast } = useToast()
  const [showCancel, setShowCancel] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [reason, setReason] = useState('')
  const [proposedDates, setProposedDates] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Ticks so the forfeiture warning stays honest in a tab left open across the boundary.
  const now = useNow()
  const insideWindow = new Date(startTimeIso).getTime() - now.getTime() < TWENTY_FOUR_HOURS_MS

  const handleCancelConfirm = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/classes/${classId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || null })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to cancel')
      }
      const data = await response.json()
      const message = data.creditOutcome === 'refunded'
        ? 'Lesson cancelled. Credit refunded to your pack.'
        : data.creditOutcome === 'forfeited'
        ? 'Lesson cancelled. Credit forfeited (inside 24 hours).'
        : 'Lesson cancelled.'
      addToast(message, 'success')
      setShowCancel(false)
      setReason('')
      onCancelled()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel'
      addToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRescheduleSubmit = async () => {
    setSubmitting(true)
    try {
      const dates = proposedDates
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
      const response = await fetch(`/api/classes/${classId}/reschedule-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_dates: dates,
          reason: reason.trim() || null
        })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send request')
      }
      addToast("Reschedule request sent to Courtney.", 'success')
      setShowReschedule(false)
      setReason('')
      setProposedDates('')
      onRescheduleRequested()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send request'
      addToast(message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          variant="outline"
          onClick={() => {
            setReason('')
            setProposedDates('')
            setShowReschedule(true)
          }}
          className="flex-1"
        >
          Request reschedule
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setReason('')
            setShowCancel(true)
          }}
          className="flex-1 border-rose-300 text-rose-700 hover:bg-rose-50"
        >
          Cancel lesson
        </Button>
      </div>

      <Modal isOpen={showCancel} onClose={() => !submitting && setShowCancel(false)} title="Cancel this lesson?">
        <div className="space-y-4">
          {insideWindow ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-charcoal-900">
              <strong>Heads up:</strong> this lesson is within 24 hours. Cancelling now will <strong>forfeit your credit</strong>. Courtney can choose to reinstate it after the fact.
            </div>
          ) : (
            <p className="text-sm text-charcoal-700">
              Your credit will be refunded back to your pack.
            </p>
          )}
          <Textarea
            label="Reason (optional)"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Anything Courtney should know"
          />
        </div>
        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => setShowCancel(false)} disabled={submitting}>
            Keep lesson
          </Button>
          <Button
            type="button"
            onClick={handleCancelConfirm}
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-700"
          >
            {submitting ? 'Cancelling…' : insideWindow ? 'Cancel and forfeit credit' : 'Cancel lesson'}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={showReschedule} onClose={() => !submitting && setShowReschedule(false)} title="Request a reschedule">
        <div className="space-y-4">
          <p className="text-sm text-charcoal-700">
            Courtney will get an email and update the lesson time herself. Your credit stays attached to the lesson.
          </p>
          <Input
            label="Dates that work better"
            placeholder="Tuesday afternoon, Saturday morning"
            value={proposedDates}
            onChange={(e) => setProposedDates(e.target.value)}
            helperText="Separate multiple with commas (optional)."
          />
          <Textarea
            label="Reason (optional)"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <ModalFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => setShowReschedule(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleRescheduleSubmit} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send request'}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
