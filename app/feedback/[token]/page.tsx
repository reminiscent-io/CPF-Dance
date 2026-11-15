import { cache } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFeedbackToken } from '@/lib/class-feedback'
import { feedbackHeading, findClassIdByFeedbackToken, loadFeedbackSubject } from '@/lib/class-feedback-server'
import { FeedbackForm } from '@/components/feedback/FeedbackForm'

/**
 * The no-login feedback form an instructor texts or emails out. The token in
 * the URL names one class, workshop or lesson (lib/class-feedback.ts); the
 * page shows its title and dates and nothing else about it.
 *
 * Reads with the service role because there is no signed-in user to check.
 */

const getSubject = cache(async (token: string) => {
  if (!isFeedbackToken(token)) return null
  const supabase = createAdminClient()
  const classId = await findClassIdByFeedbackToken(supabase, token)
  return classId ? loadFeedbackSubject(supabase, classId) : null
})

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const subject = await getSubject(token)
  return {
    title: subject ? `Feedback: ${subject.title} | CPF Dance` : 'Feedback | CPF Dance',
    // Private links: keep them out of search results
    robots: { index: false, follow: false },
  }
}

export default async function FeedbackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const subject = await getSubject(token)
  if (!subject || subject.isCancelled) notFound()

  return (
    // overflow-x-clip: the five-star sparks fly past the card; no sideways scroll
    <main className="min-h-screen overflow-x-clip bg-champagne-100 px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-charcoal-950">
          CPF Dance
        </Link>

        <article className="relative mt-header-gap rounded-lg bg-champagne-50 p-5 shadow-soft sm:p-6">
          <FeedbackForm
            heading={feedbackHeading(subject)}
            submitUrl={`/api/feedback/${token}`}
            askName
          />
        </article>
      </div>
    </main>
  )
}
