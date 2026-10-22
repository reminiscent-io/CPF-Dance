'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useExternalSignup } from '@/components/dancer/useExternalSignup'
import { ClassTypeChip, EnrolledMark } from '@/components/dancer/ClassChips'
import { signupUrlFor } from '@/lib/signup-link'
import { dayListing, isClassFull, isMultiDay, type OpenClass } from '@/lib/open-classes'
import type { WorkshopOption } from '@/lib/class-series'
import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  DocumentIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

interface OpenClassListProps {
  /** Upcoming listings, collapsed per workshop, including ones she holds. */
  listings: OpenClass[]
  studentId: string | null
  /** ?class=<id> from a shared class link, opened once the list has loaded. */
  linkedClassId: string | null
  /** Where to send the page once the shared link is handled. */
  basePath: string
  onEnrolled: () => void
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })

const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

const formatPrice = (cls: OpenClass) => {
  if (cls.pricing_model === 'per_person' && cls.cost_per_person) {
    return `$${cls.cost_per_person.toFixed(2)} per person`
  } else if (cls.pricing_model === 'per_class' && cls.base_cost) {
    return `$${cls.base_cost.toFixed(2)} per class`
  } else if (cls.pricing_model === 'per_hour' && cls.cost_per_person) {
    return `$${cls.cost_per_person.toFixed(2)} per hour`
  }
  return 'Contact instructor'
}

const formatWorkshopPrice = (cls: OpenClass) =>
  cls.workshop_price !== null ? `$${cls.workshop_price.toFixed(2)} per person` : null

/**
 * Courtney's open classes and workshops, as flyer cards with sign-up. Owns
 * the enroll confirmation, the external pay-link flow and the shared-link
 * deep link, so the page around it only supplies the data.
 */
export function OpenClassList({ listings, studentId, linkedClassId, basePath, onEnrolled }: OpenClassListProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [highlightedClassId, setHighlightedClassId] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<OpenClass | null>(null)
  const [selectedOption, setSelectedOption] = useState<WorkshopOption | undefined>()
  const [enrolling, setEnrolling] = useState(false)
  const handledLink = useRef(false)

  const externalSignup = useExternalSignup({ studentId, onEnrolled })

  // A class she holds in full moves down to her own classes
  const open = useMemo(() => listings.filter(cls => !cls.is_enrolled), [listings])

  // option is set only for workshop cards: 'full' for the whole run, 'day' for a drop-in
  const handleEnrollClick = (cls: OpenClass, option?: WorkshopOption) => {
    // The full run has its own payment link; the class link is the single-day one
    if (!externalSignup.start(cls, option)) {
      setSelectedClass(cls)
      setSelectedOption(option)
    }
  }

  const handleEnroll = async () => {
    if (!selectedClass) return
    try {
      setEnrolling(true)
      const response = await fetch('/api/dancer/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: selectedClass.id, option: selectedOption })
      })
      if (response.ok) {
        const { enrolled_days } = await response.json()
        addToast(
          enrolled_days > 1 ? `Enrolled in all ${enrolled_days} workshop days.` : `Enrolled in ${selectedClass.title}.`,
          'success'
        )
        setSelectedClass(null)
        onEnrolled()
      } else {
        const data = await response.json()
        addToast(data.error || 'Failed to enroll in class', 'error')
      }
    } catch (error) {
      console.error('Error enrolling:', error)
      addToast('Error enrolling in class', 'error')
    } finally {
      setEnrolling(false)
    }
  }

  // A shared class link lands here with ?class=<id>; any day of a workshop
  // points at its card. The target only exists once the list has loaded, so
  // the page mounts this after its fetch and the ref keeps it to one run.
  useEffect(() => {
    if (!linkedClassId || handledLink.current) return
    handledLink.current = true
    // Drop the param so a refresh doesn't reopen the dialog
    router.replace(basePath, { scroll: false })

    const listing = listings.find(
      cls => cls.id === linkedClassId || cls.days?.some(day => day.id === linkedClassId)
    )
    if (!listing) {
      addToast('That class is no longer open for sign-up', 'info')
      return
    }
    if (listing.is_enrolled) {
      addToast(`You're already enrolled in ${listing.title}`, 'info')
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reacting to a deep link once its target has loaded; the ref and the stripped parameter keep this from re-firing.
    setHighlightedClassId(listing.id)
    requestAnimationFrame(() => {
      document.getElementById(`class-${listing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })

    const option: WorkshopOption | undefined = isMultiDay(listing) ? 'full' : undefined
    if (isClassFull(listing)) {
      addToast(`${listing.title} is full`, 'info')
    } else if (!signupUrlFor(listing, option)) {
      // External sign-ups need a click to open (pop-up blockers), so those
      // stay highlighted on the card instead.
      setSelectedClass(listing)
      setSelectedOption(option)
    }
  }, [linkedClassId, listings, basePath, router, addToast])

  return (
    <>
      {open.length > 0 ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {open.map(cls => (
            <OpenClassCard
              key={cls.id}
              cls={cls}
              highlighted={highlightedClassId === cls.id}
              onSignUp={handleEnrollClick}
            />
          ))}
        </ul>
      ) : (
        <p className="border-y border-champagne-200 py-8 text-center text-sm text-charcoal-500">
          {listings.length > 0
            ? 'You are signed up for everything Courtney has open. New classes will show up here.'
            : 'No open classes right now. New workshops and classes will show up here.'}
        </p>
      )}

      <Modal
        isOpen={Boolean(selectedClass)}
        onClose={() => setSelectedClass(null)}
        title="Confirm enrollment"
        size="md"
      >
        {selectedClass && (
          <div className="space-y-4">
            <p className="text-charcoal-700">
              Enroll in <strong>{selectedClass.title}</strong>?
              {isMultiDay(selectedClass) && ` This enrolls you in all ${selectedClass.days!.length} days.`}
            </p>

            <div className="bg-champagne-100 p-4 rounded-lg space-y-2 text-sm">
              {isMultiDay(selectedClass) ? (
                selectedClass.days!.map(day => (
                  <div key={day.id} className="flex justify-between">
                    <span className="text-charcoal-500">{formatDate(day.start_time)}</span>
                    <span className="font-medium">
                      {formatTime(day.start_time)} - {formatTime(day.end_time)}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Date:</span>
                    <span className="font-medium">{formatDate(selectedClass.start_time)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500">Time:</span>
                    <span className="font-medium">
                      {formatTime(selectedClass.start_time)} - {formatTime(selectedClass.end_time)}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-charcoal-500">Price:</span>
                <span className="font-medium">
                  {selectedOption === 'full' && formatWorkshopPrice(selectedClass)
                    ? `${formatWorkshopPrice(selectedClass)}, all days`
                    : formatPrice(selectedClass)}
                </span>
              </div>
            </div>
          </div>
        )}

        <ModalFooter className="mt-6">
          <Button variant="outline" onClick={() => setSelectedClass(null)} disabled={enrolling}>
            Cancel
          </Button>
          <Button onClick={handleEnroll} disabled={enrolling}>
            {enrolling ? 'Enrolling…' : 'Confirm enrollment'}
          </Button>
        </ModalFooter>
      </Modal>

      {externalSignup.modal}
    </>
  )
}

function OpenClassCard({
  cls,
  highlighted,
  onSignUp,
}: {
  cls: OpenClass
  highlighted: boolean
  onSignUp: (cls: OpenClass, option?: WorkshopOption) => void
}) {
  const multiDay = isMultiDay(cls)
  const full = isClassFull(cls)
  const external = Boolean(signupUrlFor(cls, multiDay ? 'full' : undefined))
  const spotsLeft = cls.max_capacity !== null ? cls.max_capacity - cls.enrolled_count : null
  const place = [cls.studio?.name, cls.location].filter(Boolean).join(' · ')

  return (
    <li
      id={`class-${cls.id}`}
      className={`flex flex-col rounded-lg border border-champagne-200 bg-champagne-50 p-4 shadow-soft ${
        highlighted ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-champagne-100' : ''
      }`}
    >
      {cls.asset && (
        <a href={cls.asset.file_url} target="_blank" rel="noopener noreferrer" className="block mb-4">
          {cls.asset.file_type.startsWith('image/') ? (
            // Flyers carry text, so show the whole image rather than crop it
            <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-champagne-100">
              <Image
                src={cls.asset.file_url}
                alt={cls.asset.title}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-champagne-200 bg-champagne-100 px-3 py-2 text-sm text-charcoal-700 hover:text-charcoal-950">
              <DocumentIcon className="w-5 h-5 shrink-0" />
              <span className="truncate">{cls.asset.title}</span>
            </div>
          )}
        </a>
      )}

      <div className="flex items-baseline gap-3 flex-wrap">
        <h4 className="text-xl font-semibold leading-snug text-charcoal-950">{cls.title}</h4>
        <ClassTypeChip type={cls.class_type} />
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-charcoal-600">
        {multiDay ? (
          <ul className="space-y-1.5">
            {cls.days!.map(day => (
              <li key={day.id} className="flex items-center justify-between gap-2 tabular-nums">
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-charcoal-400" aria-hidden />
                  {formatDate(day.start_time)} · {formatTime(day.start_time)} – {formatTime(day.end_time)}
                </span>
                {day.is_enrolled ? (
                  <EnrolledMark />
                ) : !cls.workshop_full_only && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => onSignUp(dayListing(cls, day), 'day')}
                    disabled={isClassFull(day)}
                  >
                    {isClassFull(day) ? 'Full' : 'Drop in'}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-1.5 tabular-nums">
            <ClockIcon className="w-3.5 h-3.5 text-charcoal-400" aria-hidden />
            {formatDate(cls.start_time)} · {formatTime(cls.start_time)} – {formatTime(cls.end_time)}
          </p>
        )}

        {place && (
          <p className="flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 shrink-0 text-charcoal-400" aria-hidden />
            <span className="truncate">{place}</span>
          </p>
        )}
      </div>

      {cls.description && (
        <p className="mt-3 text-sm text-charcoal-600 line-clamp-3">{cls.description}</p>
      )}

      <dl className="mt-3 space-y-1 text-sm text-charcoal-700">
        <div className="flex justify-between gap-3">
          <dt className="text-charcoal-500">{multiDay ? 'Single day' : 'Price'}</dt>
          <dd>{multiDay && cls.workshop_full_only ? 'Full workshop only' : formatPrice(cls)}</dd>
        </div>
        {multiDay && formatWorkshopPrice(cls) && (
          <div className="flex justify-between gap-3">
            <dt className="text-charcoal-500">Full workshop</dt>
            <dd>{formatWorkshopPrice(cls)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-auto pt-4">
        {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 5 && (
          <p className="mb-2 text-xs text-charcoal-500">
            {spotsLeft === 1 ? '1 spot left' : `${spotsLeft} spots left`}
          </p>
        )}
        <Button
          className="w-full gap-2"
          onClick={() => onSignUp(cls, multiDay ? 'full' : undefined)}
          disabled={full}
        >
          {full
            ? 'Full'
            : multiDay
              ? `Sign up for all ${cls.days!.length} days`
              : external ? 'Sign up' : 'Enroll'}
          {!full && external && <ArrowTopRightOnSquareIcon className="w-4 h-4" aria-hidden />}
        </Button>
      </div>
    </li>
  )
}
