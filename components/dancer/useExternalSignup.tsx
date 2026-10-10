'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { WorkshopOption } from '@/lib/class-series'
import { signupUrlFor, withSignupRef } from '@/lib/signup-link'

const PENDING_EXTERNAL_SIGNUP_KEY = 'pending_external_signup'

export interface SignupClass {
  id: string
  title: string
  start_time: string
  end_time: string
  external_signup_url: string | null
  workshop_signup_url?: string | null
  instructor?: { full_name: string | null } | null
}

// What sits in sessionStorage while the dancer pays on an external page.
// Older entries stored the class itself, with no option.
interface PendingSignup {
  cls: SignupClass
  option?: WorkshopOption
}

function readPending(): PendingSignup | null {
  try {
    const raw = sessionStorage.getItem(PENDING_EXTERNAL_SIGNUP_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingSignup | SignupClass
    return 'cls' in parsed ? parsed : { cls: parsed }
  } catch (error) {
    console.error('Error checking for pending signup:', error)
    return null
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_EXTERNAL_SIGNUP_KEY)
  } catch {
    // Storage blocked; nothing to clear
  }
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

/**
 * Sign-up through a class's external link (usually a Stripe Payment Link).
 * `start` opens the link in a new tab. When the dancer comes back to this
 * tab, a Stripe payment has usually confirmed itself through the webhook;
 * if not, they confirm by hand and the class lands on their calendar.
 */
export function useExternalSignup({
  studentId,
  onEnrolled
}: {
  studentId: string | null
  onEnrolled: () => void
}) {
  const { addToast } = useToast()
  const [pending, setPending] = useState<PendingSignup | null>(null)
  const [confirming, setConfirming] = useState(false)
  const checking = useRef(false)
  const onEnrolledRef = useRef(onEnrolled)
  useEffect(() => {
    onEnrolledRef.current = onEnrolled
  }, [onEnrolled])

  const finish = useCallback((message: string) => {
    addToast(message, 'success')
    clearPending()
    setPending(null)
    onEnrolledRef.current()
  }, [addToast])

  // On return: if Stripe already confirmed the sign-up, say so; otherwise ask
  const checkForPendingSignup = useCallback(async () => {
    if (checking.current) return
    const found = readPending()
    if (!found) return
    checking.current = true
    try {
      const response = await fetch('/api/dancer/public-classes')
      if (response.ok) {
        const { classes } = await response.json() as { classes: { id: string; is_enrolled: boolean }[] }
        if (classes?.some(cls => cls.id === found.cls.id && cls.is_enrolled)) {
          finish(`Payment received. ${found.cls.title} is on your calendar.`)
          return
        }
      }
      setPending(found)
    } catch {
      setPending(found)
    } finally {
      checking.current = false
    }
  }, [finish])

  // On mount (a full reload after paying) and whenever the tab regains focus
  useEffect(() => {
    queueMicrotask(checkForPendingSignup)
    window.addEventListener('focus', checkForPendingSignup)
    return () => window.removeEventListener('focus', checkForPendingSignup)
  }, [checkForPendingSignup])

  /** Open the class's external sign-up link. False when it has none. */
  const start = useCallback((cls: SignupClass, option?: WorkshopOption) => {
    const url = signupUrlFor(cls, option)
    if (!url) return false
    const entry: PendingSignup = {
      cls: {
        id: cls.id,
        title: cls.title,
        start_time: cls.start_time,
        end_time: cls.end_time,
        external_signup_url: cls.external_signup_url,
        workshop_signup_url: cls.workshop_signup_url,
        instructor: cls.instructor
      },
      option
    }
    try {
      sessionStorage.setItem(PENDING_EXTERNAL_SIGNUP_KEY, JSON.stringify(entry))
    } catch {
      // Storage blocked: Stripe can still confirm, the dancer just won't be asked
    }
    const ref = studentId ? { classId: cls.id, studentId, option } : null
    window.open(withSignupRef(url, ref), '_blank', 'noopener,noreferrer')
    return true
  }, [studentId])

  const confirm = async () => {
    if (!pending) return
    try {
      setConfirming(true)
      const response = await fetch('/api/dancer/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: pending.cls.id, option: pending.option })
      })
      const data = await response.json()
      if (response.ok) {
        finish(data.enrolled_days > 1
          ? `All ${data.enrolled_days} workshop days added to your calendar!`
          : 'Class added to your calendar!')
      } else if (data.already_enrolled) {
        // Stripe got there first
        finish(`${pending.cls.title} is already on your calendar.`)
      } else {
        addToast(data.error || 'Failed to add class to calendar', 'error')
      }
    } catch (error) {
      console.error('Error adding to calendar:', error)
      addToast('Error adding class to calendar', 'error')
    } finally {
      setConfirming(false)
    }
  }

  const cancel = () => {
    clearPending()
    setPending(null)
  }

  const cls = pending?.cls
  const modal = (
    <Modal isOpen={!!pending} onClose={cancel} title="Add Class to Calendar" size="md">
      {cls && (
        <div className="space-y-4">
          <div className="bg-champagne-100 border border-champagne-200 rounded-lg p-4">
            <p className="text-charcoal-900 font-medium">
              ✓ Great! Did you complete the signup for <strong>{cls.title}</strong>?
            </p>
          </div>

          <p className="text-charcoal-700">
            If you’ve signed up through the external portal, click “Add to Calendar” to track this class in your schedule.
          </p>

          <div className="bg-champagne-100 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-charcoal-500">Date:</span>
              <span className="font-medium">{formatDate(cls.start_time)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-charcoal-500">Time:</span>
              <span className="font-medium">
                {formatTime(cls.start_time)} - {formatTime(cls.end_time)}
              </span>
            </div>
            {cls.instructor?.full_name && (
              <div className="flex justify-between">
                <span className="text-charcoal-500">Instructor:</span>
                <span className="font-medium">{cls.instructor.full_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <ModalFooter className="mt-6">
        <Button variant="outline" onClick={cancel} disabled={confirming}>
          Cancel
        </Button>
        <Button onClick={confirm} disabled={confirming}>
          {confirming ? 'Adding...' : 'Add to Calendar'}
        </Button>
      </ModalFooter>
    </Modal>
  )

  return { start, modal }
}
