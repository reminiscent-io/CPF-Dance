'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { RequestComposer } from '@/components/RequestComposer'
import { InFlightSection, type LessonRequest } from '@/components/InFlightSection'
import { DeleteRequestDialog } from '@/components/DeleteRequestDialog'
import { RequestBanner, type BannerTone } from '@/components/RequestBanner'
import { LessonPackHistory } from '@/components/LessonPackHistory'
import { LessonPackSelector } from '@/components/LessonPackSelector'
import {
  UpcomingPrivateLessons,
  type UpcomingPrivateLesson
} from '@/components/dancer/UpcomingPrivateLessons'

interface PurchaseRow {
  id: string
  remaining_lessons: number
  purchased_at: string
}

interface BannerState {
  tone: BannerTone
  message: string
}

interface EnrolledClass extends UpcomingPrivateLesson {
  class_type: string
  is_cancelled: boolean | null
}

const PACK_VALIDITY_MONTHS = 12
const SOON_EXPIRY_DAYS = 30

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

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function PrivateLessonsContent() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [requests, setRequests] = useState<LessonRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)

  const [upcoming, setUpcoming] = useState<UpcomingPrivateLesson[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(true)

  const [balance, setBalance] = useState(0)
  const [hasPurchases, setHasPurchases] = useState(false)
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

  const fetchRequests = useCallback(async () => {
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
  }, [])

  const fetchUpcoming = useCallback(async () => {
    try {
      const response = await fetch('/api/dancer/classes')
      if (response.ok) {
        const data = await response.json()
        const now = Date.now()
        setUpcoming(
          ((data.classes || []) as EnrolledClass[])
            .filter((c) => c.class_type === 'private' && !c.is_cancelled)
            .filter((c) => new Date(c.end_time).getTime() >= now)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        )
      }
    } catch (err) {
      console.error('Error fetching upcoming lessons:', err)
    } finally {
      setLoadingUpcoming(false)
    }
  }, [])

  const fetchBalance = useCallback(async () => {
    try {
      const response = await fetch('/api/dancer/lesson-packs/history')
      if (response.ok) {
        const data = await response.json()
        setBalance(data.totalRemaining || 0)
        setHasPurchases((data.purchases || []).length > 0)
        setEarliestExpiry(deriveEarliestExpiry(data.purchases || []))
      }
    } catch (err) {
      console.error('Error fetching balance:', err)
    } finally {
      setLoadingBalance(false)
    }
  }, [])

  const fetchInstructor = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchRequests()
      fetchUpcoming()
      fetchBalance()
      fetchInstructor()
    }
  }, [loading, user, profile, fetchRequests, fetchUpcoming, fetchBalance, fetchInstructor])

  // Reacting to the Stripe redirect. This is a navigation event rather than
  // render state, so the banner genuinely has to be set from an effect.
  useEffect(() => {
    const success = searchParams?.get('success')
    const canceled = searchParams?.get('canceled')
    if (success !== 'true' && canceled !== 'true') return

    const nextBanner: BannerState = success === 'true'
      ? { tone: 'gilt', message: 'Pack added. Refreshing your balance…' }
      : { tone: 'neutral', message: 'Payment canceled. Your packs are unchanged.' }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Responding to a Stripe return URL; the parameter is stripped below so this cannot re-fire.
    setBanner(nextBanner)
    if (success === 'true') fetchBalance()
    router.replace('/dancer/request-lesson')
  }, [searchParams, router, fetchBalance])

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

  const scrollToPacks = () => {
    document.getElementById('packs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) {
    return (
      <PortalLayout profile={profile}>
        <PageSkeleton variant="cards" />
      </PortalLayout>
    )
  }

  if (!user || !profile) return null

  const expiringSoon =
    earliestExpiry.date !== null &&
    earliestExpiry.count > 0 &&
    daysUntil(earliestExpiry.date) >= 0 &&
    daysUntil(earliestExpiry.date) <= SOON_EXPIRY_DAYS

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Private Lessons"
        subtitle="One-on-one time with Courtney. Pick a pack, then tell her what you want to work on."
      />

      {banner && (
        <div className="mt-header-gap">
          <RequestBanner
            tone={banner.tone}
            message={banner.message}
            onDismiss={() => setBanner(null)}
          />
        </div>
      )}

      {/* Hero: the pack shelf, with the dancer's balance beside it */}
      <section
        id="packs"
        aria-labelledby="packs-heading"
        className="mt-header-gap scroll-mt-6 rounded-lg bg-champagne-100 p-5 md:p-6"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-10">
          <div className="max-w-md">
            <h2 id="packs-heading" className="font-serif text-2xl text-charcoal-950 tracking-[-0.02em]">
              Lesson packs
            </h2>
            <p className="mt-2 text-sm text-charcoal-500 leading-relaxed">
              Each lesson covers one private with Courtney. Packs stay good for 12 months and are used oldest first.
            </p>
          </div>

          <div className="md:text-right">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">Your balance</p>
            {loadingBalance ? (
              <div className="mt-2 space-y-2 md:flex md:flex-col md:items-end" aria-hidden>
                <Skeleton variant="text" width={120} height={36} />
              </div>
            ) : balance > 0 ? (
              <p className="mt-1 flex items-baseline gap-2 md:justify-end">
                <span className="font-serif text-5xl text-charcoal-950 leading-none tracking-[-0.03em] tabular-nums">
                  {balance}
                </span>
                <span className="text-sm text-charcoal-500">
                  {balance === 1 ? 'lesson left' : 'lessons left'}
                  {balance === 1 && <span className="ml-1.5 text-gold-700">· last one</span>}
                </span>
              </p>
            ) : (
              <p className="mt-1 font-serif text-2xl text-charcoal-950 tracking-[-0.02em]">
                No lessons yet
              </p>
            )}
            {!loadingBalance && expiringSoon && (
              <p className="mt-1 text-sm text-rose-700">
                {earliestExpiry.count} expire{earliestExpiry.count === 1 ? 's' : ''}{' '}
                {new Date(earliestExpiry.date!).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
            {hasPurchases && (
              <button
                type="button"
                onClick={() => setShowHistory(true)}
                className="mt-2 text-sm text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline transition-colors"
              >
                see pack history
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <LessonPackSelector instructorId={instructorId} />
        </div>
      </section>

      <section aria-labelledby="request-heading" className="mt-10">
        <h2 id="request-heading" className="font-serif text-2xl text-charcoal-950 tracking-[-0.02em]">
          Request a lesson
        </h2>
        <p className="mt-1 text-sm text-charcoal-500">
          Tell Courtney what you want to work on. She’ll reply with a time.
        </p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <RequestComposer
            balance={balance}
            submitting={submitting}
            onSubmit={handleSubmit}
            onAddPack={scrollToPacks}
          />
          <InFlightSection
            requests={requests}
            loading={loadingRequests}
            onRequestDelete={(id) => setPendingDelete(id)}
            deletingId={deletingId}
          />
        </div>
      </section>

      <section aria-labelledby="upcoming-heading" className="mt-10">
        <h2 id="upcoming-heading" className="font-serif text-2xl text-charcoal-950 tracking-[-0.02em] mb-4">
          Upcoming lessons
        </h2>
        <UpcomingPrivateLessons lessons={upcoming} loading={loadingUpcoming} />
      </section>

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

// useSearchParams() opts the tree into client-side rendering, so Next requires
// a Suspense boundary above it for the page to prerender.
export default function PrivateLessonsPage() {
  return (
    <Suspense fallback={
      <PortalLayout profile={null}>
        <PageSkeleton variant="cards" />
      </PortalLayout>
    }>
      <PrivateLessonsContent />
    </Suspense>
  )
}
