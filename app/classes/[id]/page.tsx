import { cache } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLoginPathFor, NEXT_PARAM } from '@/lib/auth/portal-routing'
import { dollarsToCents, formatCents } from '@/lib/utils/money'
import { formatDateET, formatTimeET } from '@/lib/utils/et-timezone'

/**
 * Public preview of one class, for the "Copy signup link" an instructor shares.
 * Anyone can open it. Enrolling still happens in the dancer portal: the buttons
 * here go through login or signup and land on that class in Available Classes.
 *
 * Reads with the service role because there is no caller to authorize. It only
 * ever returns a class the instructor marked public, and only the fields the
 * dancer portal already shows on Available Classes.
 */

interface ClassDay {
  id: string
  start_time: string
  end_time: string
  max_capacity: number | null
}

interface PublicClassRow extends ClassDay {
  title: string
  description: string | null
  location: string | null
  class_type: string
  series_id: string | null
  pricing_model: string
  cost_per_person: number | null
  base_cost: number | null
  workshop_price: number | null
  workshop_full_only: boolean
  instructor_id: string | null
  studio: { name: string } | null
  asset: { title: string; file_url: string; file_type: string } | null
}

interface PublicClassPreview {
  cls: PublicClassRow
  /** Days still ahead, in order. A plain class has at most one. */
  upcomingDays: ClassDay[]
  isFull: boolean
  instructorName: string | null
}

const getPublicClass = cache(async (id: string): Promise<PublicClassPreview | null> => {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('classes')
    .select(`
      id, title, description, location, start_time, end_time, class_type, series_id,
      max_capacity, pricing_model, cost_per_person, base_cost,
      workshop_price, workshop_full_only, instructor_id,
      studio:studios(name),
      asset:assets(title, file_url, file_type)
    `)
    .eq('id', id)
    .eq('is_public', true)
    .eq('is_cancelled', false)
    .maybeSingle()

  // A malformed id is a Postgres error, not a miss; both are a 404 here
  const cls = data as PublicClassRow | null
  if (error || !cls) return null

  // A workshop link names one day; the preview shows the whole run
  let days: ClassDay[] = [cls]
  if (cls.class_type === 'workshop' && cls.series_id) {
    const { data: seriesDays } = await supabase
      .from('classes')
      .select('id, start_time, end_time, max_capacity')
      .eq('series_id', cls.series_id)
      .eq('is_public', true)
      .eq('is_cancelled', false)
      .order('start_time', { ascending: true })
    if (seriesDays?.length) days = seriesDays as ClassDay[]
  }

  const now = Date.now()
  const upcomingDays = days.filter(day => new Date(day.start_time).getTime() > now)

  // Same rule as the Available Classes card: full once any day is full
  let isFull = false
  const capped = upcomingDays.filter(day => day.max_capacity !== null)
  if (capped.length > 0) {
    const { data: taken } = await supabase
      .from('enrollments')
      .select('class_id')
      .in('class_id', capped.map(day => day.id))
    const counts = new Map<string, number>()
    for (const row of taken || []) {
      counts.set(row.class_id, (counts.get(row.class_id) || 0) + 1)
    }
    isFull = capped.some(day => (counts.get(day.id) || 0) >= day.max_capacity!)
  }

  let instructorName: string | null = null
  if (cls.instructor_id) {
    const { data: instructor } = await supabase
      .from('public_profiles')
      .select('full_name')
      .eq('id', cls.instructor_id)
      .maybeSingle()
    instructorName = instructor?.full_name ?? null
  }

  return { cls, upcomingDays, isFull, instructorName }
})

const money = (dollars: number) => formatCents(dollarsToCents(dollars))

function formatPrice(cls: PublicClassRow): string {
  if (cls.pricing_model === 'per_person' && cls.cost_per_person) return `${money(cls.cost_per_person)} per person`
  if (cls.pricing_model === 'per_class' && cls.base_cost) return `${money(cls.base_cost)} per class`
  if (cls.pricing_model === 'per_hour' && cls.cost_per_person) return `${money(cls.cost_per_person)} per hour`
  return 'Contact instructor'
}

const formatDay = (iso: string) => formatDateET(iso, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
const formatTimes = (day: ClassDay) => `${formatTimeET(day.start_time)} – ${formatTimeET(day.end_time)} ET`

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const preview = await getPublicClass(id)
  if (!preview) return { title: 'Class not found | CPF Dance' }

  const { cls, upcomingDays } = preview
  const when = upcomingDays[0] ? formatDay(upcomingDays[0].start_time) : null
  const description = [when, cls.studio?.name ?? cls.location].filter(Boolean).join(' · ')
  const image = cls.asset?.file_type.startsWith('image/') ? cls.asset.file_url : undefined

  return {
    title: `${cls.title} | CPF Dance`,
    description: description || undefined,
    openGraph: {
      title: cls.title,
      description: description || undefined,
      images: image ? [image] : undefined,
    },
  }
}

export default async function PublicClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const preview = await getPublicClass(id)
  if (!preview) notFound()

  const { cls, upcomingDays, isFull, instructorName } = preview
  const isOver = upcomingDays.length === 0
  const isMultiDay = upcomingDays.length > 1

  // Any day of a workshop opens its card, so the first upcoming one will do
  const enrollPath = isOver
    ? '/dancer/available-classes'
    : `/dancer/available-classes?class=${encodeURIComponent(upcomingDays[0].id)}`
  const signupPath = `/signup?portal=dancer&${NEXT_PARAM}=${encodeURIComponent(enrollPath)}`

  return (
    <main className="min-h-screen bg-champagne-100 px-4 py-8">
      <div className="mx-auto w-full max-w-xl">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight text-charcoal-950">
          CPF Dance
        </Link>

        <article className="mt-header-gap rounded-lg bg-champagne-50 p-6 shadow-soft">
          {cls.asset?.file_type.startsWith('image/') && (
            // Flyers carry text, so show the whole image rather than crop it
            <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-lg bg-champagne-100">
              <Image
                src={cls.asset.file_url}
                alt={cls.asset.title}
                fill
                sizes="(min-width: 640px) 36rem, 100vw"
                className="object-contain"
                priority
              />
            </div>
          )}

          <h1 className="text-3xl font-semibold tracking-tight text-charcoal-950">{cls.title}</h1>
          {instructorName && (
            <p className="mt-1 text-charcoal-500">with {instructorName}</p>
          )}

          {cls.description && (
            <p className="mt-4 whitespace-pre-line text-charcoal-700">{cls.description}</p>
          )}

          <dl className="mt-6 space-y-3 border-t border-champagne-200 pt-4 text-sm text-charcoal-700">
            {!isOver && (
              <div>
                <dt className="font-medium text-charcoal-900">{isMultiDay ? `${upcomingDays.length} days` : 'When'}</dt>
                {upcomingDays.map(day => (
                  <dd key={day.id} className="tabular-nums">
                    {formatDay(day.start_time)} · {formatTimes(day)}
                  </dd>
                ))}
              </div>
            )}

            {(cls.studio || cls.location) && (
              <div>
                <dt className="font-medium text-charcoal-900">Where</dt>
                {cls.studio && <dd>{cls.studio.name}</dd>}
                {cls.location && <dd>{cls.location}</dd>}
              </div>
            )}

            <div>
              <dt className="font-medium text-charcoal-900">Price</dt>
              {isMultiDay && cls.workshop_price !== null && (
                <dd>Full workshop: {money(cls.workshop_price)} per person</dd>
              )}
              {!(isMultiDay && cls.workshop_full_only) && (
                <dd>{isMultiDay ? `Single day: ${formatPrice(cls)}` : formatPrice(cls)}</dd>
              )}
            </div>
          </dl>

          <div className="mt-6 border-t border-champagne-200 pt-6">
            {isOver ? (
              <p className="text-charcoal-700">
                This class has already taken place.{' '}
                <Link href={getLoginPathFor(enrollPath)} className="font-medium text-rose-700 hover:underline">
                  See what&rsquo;s open now
                </Link>
              </p>
            ) : (
              <>
                {isFull && (
                  <p className="mb-4 text-sm text-charcoal-700">
                    This class is full right now. Sign in to check for an open spot.
                  </p>
                )}
                <Link
                  href={getLoginPathFor(enrollPath)}
                  className="inline-flex min-h-control w-full items-center justify-center rounded-lg bg-rose-600 px-4 py-2 font-medium text-champagne-50 transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  Sign in to enroll
                </Link>
                <p className="mt-4 text-center text-sm text-charcoal-500">
                  New to CPF Dance?{' '}
                  <Link href={signupPath} className="font-medium text-rose-700 hover:underline">
                    Create an account
                  </Link>
                </p>
              </>
            )}
          </div>
        </article>
      </div>
    </main>
  )
}
