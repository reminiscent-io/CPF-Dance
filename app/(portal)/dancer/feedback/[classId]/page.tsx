'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/auth/hooks'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { PortalLayout } from '@/components/PortalLayout'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { FeedbackForm, type FeedbackDraft } from '@/components/feedback/FeedbackForm'
import type { FeedbackHeading } from '@/lib/class-feedback'

interface FeedbackResponse {
  heading: FeedbackHeading
  hasStarted: boolean
  feedback: FeedbackDraft | null
}

/**
 * Feedback on one of the dancer's classes, from the schedule or the dashboard.
 * The same form as the no-login link, minus the name: she's signed in. Sending
 * again updates her earlier response.
 */
export default function DancerFeedbackPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const params = useParams<{ classId: string }>()
  const classId = params?.classId

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian' && profile.role !== 'admin') {
      router.push('/instructor')
    }
  }, [loading, profile, router])

  const { data, loading: loadingFeedback, error } = useAsyncData(
    async signal => {
      const response = await fetch(`/api/dancer/feedback/${encodeURIComponent(classId!)}`, { signal })
      if (response.status === 404) throw new Error('not-found')
      if (!response.ok) throw new Error('Could not load this class')
      return (await response.json()) as FeedbackResponse
    },
    [classId],
    { enabled: !loading && !!user && !!classId }
  )

  if (loading || (!data && !error && loadingFeedback)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-champagne-50">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user || !profile) return null

  return (
    <PortalLayout profile={profile}>
      {/* overflow-x-clip: the five-star sparks fly past the card; no sideways scroll */}
      <div className="mx-auto w-full max-w-xl overflow-x-clip">
        <Link
          href="/dancer/schedule"
          className="-ml-1 inline-flex min-h-control items-center gap-1 text-sm tracking-[0.04em] text-charcoal-500 hover:text-rose-700"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          Schedule
        </Link>

        {error || !data ? (
          <div className="mt-4">
            <EmptyState
              message={
                error === 'not-found'
                  ? 'Class not found. You can leave feedback on classes you’re enrolled in.'
                  : 'We couldn’t load this class. Check your connection and try again.'
              }
            />
          </div>
        ) : !data.hasStarted ? (
          <div className="mt-4">
            <EmptyState message={`Feedback on ${data.heading.title} opens once it starts. Come back after.`} />
          </div>
        ) : (
          <div className="relative mt-4 rounded-lg bg-champagne-50 p-5 shadow-soft sm:p-6">
            <FeedbackForm
              heading={data.heading}
              submitUrl={`/api/dancer/feedback/${encodeURIComponent(classId!)}`}
              askName={false}
              initial={data.feedback}
            />
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
