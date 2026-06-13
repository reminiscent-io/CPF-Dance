'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Spinner } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/ui/PageHeader'
import { LessonBalanceLedger } from '@/components/LessonBalanceLedger'
import { RequestComposer } from '@/components/RequestComposer'
import { InFlightSection, type LessonRequest } from '@/components/InFlightSection'
import { DeleteRequestDialog } from '@/components/DeleteRequestDialog'
import { RequestBanner, type BannerTone } from '@/components/RequestBanner'
import { LessonPackHistory } from '@/components/LessonPackHistory'
import { LessonPackSelector } from '@/components/LessonPackSelector'

interface PurchaseRow {
  id: string
  remaining_lessons: number
  purchased_at: string
}

interface BannerState {
  tone: BannerTone
  message: string
}

const PACK_VALIDITY_MONTHS = 12

function addMonths(iso: string, months: number): string {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}

function deriveEarliestExpiry(purchases: PurchaseRow[]): { date: string | null; count: number } {
  const active = purchases
    .filter((p) => p.remaining_lessons > 0)
    .map((p) => ({ ...p, expiry: addMonths(p.purchased_at, PACK_VALIDITY_MONTHS) }))
    .sort((a, b) => new Date(a.expiry).getTime() - new Date(b.expiry).getTime())
  if (active.length === 0) return { date: null, count: 0 }
  return { date: active[0].expiry, count: active[0].remaining_lessons }
}

export default function PrivateLessonsPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()

  const [requests, setRequests] = useState<LessonRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [balance, setBalance] = useState(0)
  const [earliestExpiry, setEarliestExpiry] = useState<{ date: string | null; count: number }>({
    date: null,
    count: 0
  })
  const [loadingBalance, setLoadingBalance] = useState(true)

  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const [banner, setBanner] = useState<BannerState | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)

  const [instructorId, setInstructorId] = useState<string | null>(null)

  const hasFetched = useRef(false)

  useEffect(() => {
    if (
      !loading &&
      profile &&
      profile.role !== 'dancer' &&
      profile.role !== 'admin' &&
      profile.role !== 'guardian'
    ) {
      router.push(profile.role === 'instructor' ? '/instructor' : '/studio')
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchRequests()
      fetchBalance()
      fetchInstructor()
    }
  }, [loading, user, profile])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const canceled = params.get('canceled')
    if (success === 'true') {
      setBanner({ tone: 'gilt', message: 'Pack added. Refreshing your balance…' })
      fetchBalance()
      router.replace('/dancer/request-lesson')
    } else if (canceled === 'true') {
      setBanner({ tone: 'neutral', message: 'Payment canceled. Your packs are unchanged.' })
      router.replace('/dancer/request-lesson')
    }
  }, [router])

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/dancer/lesson-requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests)
      }
    } catch (err) {
      console.error('Error fetching requests:', err)
    } finally {
      setLoadingRequests(false)
    }
  }

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/dancer/lesson-packs/history')
      if (response.ok) {
        const data = await response.json()
        setBalance(data.totalRemaining || 0)
        setEarliestExpiry(deriveEarliestExpiry(data.purchases || []))
      }
    } catch (err) {
      console.error('Error fetching balance:', err)
    } finally {
      setLoadingBalance(false)
    }
  }

  const fetchInstructor = async () => {
    try {
      const response = await fetch('/api/dancer/instructors')
      if (response.ok) {
        const data = await response.json()
        if (data.instructors && data.instructors.length > 0) {
          setInstructorId(data.instructors[0].id)
        }
      }
    } catch (err) {
      console.error('Error fetching instructors:', err)
    }
  }

  const handleSubmit = async (data: {
    focus: string
    preferredDates: string[]
    additionalNotes: string | null
  }) => {
    setSubmitting(true)
    try {
      const response = await fetch('/api/dancer/lesson-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_focus: data.focus,
          preferred_dates: data.preferredDates,
          additional_notes: data.additionalNotes,
          instructor_id: instructorId
        })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setBanner({
          tone: 'error',
          message: err.error || "Couldn't send. Try again, or check your connection."
        })
        return
      }
      setBanner({ tone: 'success', message: 'Sent. Courtney will get back to you.' })
      await fetchRequests()
    } catch (err) {
      console.error('Error submitting request:', err)
      setBanner({
        tone: 'error',
        message: "Couldn't send. Try again, or check your connection."
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return
    const id = pendingDelete
    setDeletingId(id)
    try {
      const response = await fetch(`/api/dancer/lesson-requests?id=${id}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setBanner({ tone: 'success', message: 'Request deleted.' })
        await fetchRequests()
        setPendingDelete(null)
      } else {
        const err = await response.json().catch(() => ({}))
        setBanner({
          tone: 'error',
          message: err.error || "Couldn't delete that request."
        })
      }
    } catch (err) {
      console.error('Error deleting request:', err)
      setBanner({ tone: 'error', message: "Couldn't delete that request." })
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddPack = () => {
    setShowPurchase(true)
  }

  const handlePackPurchased = async () => {
    setShowPurchase(false)
    setBanner({ tone: 'gilt', message: 'Pack added.' })
    await fetchBalance()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <Spinner size="lg" color="rose" />
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <PortalLayout profile={profile}>
      <header className="mb-8 lg:mb-12">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div className="lg:flex-1 lg:max-w-xl">
            <PageHeader
              title="Private Lessons"
              subtitle="Tell Courtney what you want to work on. She'll get back to you."
            />
          </div>
          <div className="mt-6 lg:mt-0 lg:shrink-0">
            <LessonBalanceLedger
              totalRemaining={balance}
              earliestExpiryDate={earliestExpiry.date}
              earliestExpiryCount={earliestExpiry.count}
              loading={loadingBalance}
              onShowHistory={() => setShowHistory(true)}
              onAddPack={handleAddPack}
            />
          </div>
        </div>
      </header>

      {banner && (
        <div className="mb-6">
          <RequestBanner
            tone={banner.tone}
            message={banner.message}
            onDismiss={() => setBanner(null)}
          />
        </div>
      )}

      {showPurchase ? (
        <section aria-label="Buy a lesson pack" className="space-y-6">
          <button
            type="button"
            onClick={() => setShowPurchase(false)}
            className="text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
          >
            ← back to requests
          </button>
          <LessonPackSelector
            onSelectPack={handlePackPurchased}
            instructorId={instructorId}
          />
        </section>
      ) : (
        <>
          <div className="mb-12 md:mb-16">
            <RequestComposer
              balance={balance}
              submitting={submitting}
              onSubmit={handleSubmit}
              onAddPack={handleAddPack}
            />
          </div>
          <InFlightSection
            requests={requests}
            loading={loadingRequests}
            onRequestDelete={(id) => setPendingDelete(id)}
            deletingId={deletingId}
          />
        </>
      )}

      <DeleteRequestDialog
        isOpen={!!pendingDelete}
        isDeleting={!!deletingId}
        onConfirm={handleDeleteConfirm}
        onClose={() => {
          if (!deletingId) setPendingDelete(null)
        }}
      />

      <LessonPackHistory isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </PortalLayout>
  )
}
