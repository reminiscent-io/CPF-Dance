'use client'

import Link from 'next/link'
import { ArrowTopRightOnSquareIcon, MapPinIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { Skeleton } from '@/components/ui/Skeleton'

export interface UpcomingPrivateLesson {
  id: string
  title: string
  start_time: string
  end_time: string
  location: string | null
  is_virtual: boolean | null
  google_meet_url: string | null
  studio: { name: string } | null
}

interface UpcomingPrivateLessonsProps {
  lessons: UpcomingPrivateLesson[]
  loading: boolean
}

function timeRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${fmt(start)} – ${fmt(end)}`
}

/** The dancer's own booked private lessons, soonest first. */
export function UpcomingPrivateLessons({ lessons, loading }: UpcomingPrivateLessonsProps) {
  if (loading) {
    return (
      <div className="space-y-3" aria-hidden>
        <Skeleton variant="rectangular" height={64} />
        <Skeleton variant="rectangular" height={64} />
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <p className="text-sm text-charcoal-500">
        Nothing booked yet. Once Courtney schedules a request, it shows up here and on your{' '}
        <Link href="/dancer/schedule" className="text-rose-700 hover:text-rose-800 underline-offset-4 hover:underline">
          calendar
        </Link>
        .
      </p>
    )
  }

  return (
    <ul className="divide-y divide-champagne-200 border-y border-champagne-200">
      {lessons.map((lesson) => {
        const start = new Date(lesson.start_time)
        const place = lesson.studio?.name || lesson.location
        const meetUrl = lesson.is_virtual ? lesson.google_meet_url : null
        return (
          <li key={lesson.id} className="flex items-center gap-5 py-4">
            <div className="w-12 shrink-0 text-center">
              <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">
                {start.toLocaleDateString('en-US', { month: 'short' })}
              </p>
              <p className="font-serif text-3xl text-charcoal-950 leading-none tracking-[-0.03em] tabular-nums">
                {start.getDate()}
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base text-charcoal-950 truncate" style={{ fontWeight: 600 }}>
                {lesson.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal-500">
                <span>
                  {start.toLocaleDateString('en-US', { weekday: 'long' })}, {timeRange(lesson.start_time, lesson.end_time)}
                </span>
                {meetUrl ? (
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-rose-700 hover:text-rose-800"
                  >
                    <VideoCameraIcon className="w-4 h-4" aria-hidden />
                    Join on Meet
                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" aria-hidden />
                  </a>
                ) : place ? (
                  <span className="flex items-center gap-1 min-w-0">
                    <MapPinIcon className="w-4 h-4 shrink-0" aria-hidden />
                    <span className="truncate">{place}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
