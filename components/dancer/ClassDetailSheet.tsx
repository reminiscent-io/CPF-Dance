'use client'

import { Sheet, SheetBody, SheetFooter } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { NoteViewContent } from '@/components/notes/NoteViewContent'
import { Note } from '@/lib/utils/date-helpers'
import {
  formatClassDate,
  formatTimeRange,
  formatClassTime,
} from '@/lib/utils/class-dates'
import {
  ClockIcon,
  MapPinIcon,
  UserIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'

export interface DetailEnrolledClass {
  source: 'enrolled'
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  is_virtual: boolean
  google_meet_url: string | null
  attendance_status: string | null
  enrollment_notes: string | null
  instructor_name: string
  studio: { name: string; address: string | null; city: string | null; state: string | null } | null
}

export interface DetailPersonalClass {
  source: 'personal'
  id: string
  title: string
  instructor_name: string | null
  location: string | null
  start_time: string
  end_time: string | null
  notes: string | null
  is_recurring: boolean
}

export type DetailClass = DetailEnrolledClass | DetailPersonalClass

interface ClassDetailSheetProps {
  isOpen: boolean
  onClose: () => void
  cls: DetailClass | null
  notes: Note[]
  /** Personal-class actions surface here when present. */
  onEdit?: (cls: DetailPersonalClass) => void
  onDelete?: (cls: DetailPersonalClass) => void
  currentUserName?: string
}

const CLASS_TYPE_LABEL: Record<string, string> = {
  group: 'Group',
  private: 'Private',
  workshop: 'Workshop',
  master_class: 'Master class',
}

export function ClassDetailSheet({
  isOpen,
  onClose,
  cls,
  notes,
  onEdit,
  onDelete,
  currentUserName,
}: ClassDetailSheetProps) {
  if (!cls) return null

  const isPersonal = cls.source === 'personal'
  const isEnrolled = cls.source === 'enrolled'
  const enrolled = isEnrolled ? cls : null
  const personal = isPersonal ? cls : null
  const start = new Date(cls.start_time)
  const end = isEnrolled ? cls.end_time : (personal?.end_time ?? null)
  const cancelled = enrolled?.is_cancelled ?? false

  const locationText = enrolled
    ? [enrolled.studio?.name, enrolled.studio?.city].filter(Boolean).join(', ') ||
      enrolled.location
    : personal?.location

  const instructorText = enrolled?.instructor_name || personal?.instructor_name
  const description = enrolled?.description
  const enrollmentNote = enrolled?.enrollment_notes
  const personalNote = personal?.notes
  const typeLabel = enrolled ? CLASS_TYPE_LABEL[enrolled.class_type] ?? enrolled.class_type.replace('_', ' ') : null
  const meetUrl = enrolled?.is_virtual ? enrolled.google_meet_url : null

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={cls.title}
      description={`${formatClassDate(cls.start_time)} · ${end ? formatTimeRange(cls.start_time, end) : formatClassTime(cls.start_time)}`}
      size="lg"
    >
      <SheetBody className="space-y-8">
        {/* Status row */}
        <div className="flex flex-wrap items-center gap-2">
          {typeLabel && (
            <span className="inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm bg-champagne-100 text-charcoal-600">
              {typeLabel}
            </span>
          )}
          {isPersonal && (
            <span className="inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm bg-champagne-100 text-charcoal-600">
              Personal
            </span>
          )}
          {enrolled?.is_virtual && (
            <span className="inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm bg-gold-100 text-gold-800">
              Virtual
            </span>
          )}
          {cancelled && (
            <span className="inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm bg-rose-100 text-rose-700">
              Cancelled
            </span>
          )}
          {enrolled?.attendance_status && (
            <span
              className={`inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm ${
                enrolled.attendance_status === 'present'
                  ? 'bg-gold-100 text-gold-800'
                  : enrolled.attendance_status === 'excused'
                    ? 'bg-champagne-100 text-charcoal-600'
                    : 'bg-rose-100 text-rose-700'
              }`}
            >
              {enrolled.attendance_status}
            </span>
          )}
        </div>

        {/* Join virtual lesson */}
        {meetUrl && !cancelled && (
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white font-medium rounded-lg transition-colors"
          >
            <VideoCameraIcon className="w-5 h-5" />
            Join Google Meet
          </a>
        )}

        {/* Meta — when, where, with whom */}
        <dl className="space-y-3 text-sm">
          <MetaRow icon={<ClockIcon className="w-4 h-4" />} label="When">
            {end ? formatTimeRange(cls.start_time, end) : formatClassTime(cls.start_time)}
            <span className="text-charcoal-400"> · </span>
            <span className="text-charcoal-500">
              {start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </MetaRow>
          {locationText && (
            <MetaRow icon={<MapPinIcon className="w-4 h-4" />} label="Where">
              {locationText}
              {enrolled?.studio?.address && (
                <span className="block text-charcoal-500 text-xs mt-0.5">
                  {enrolled.studio.address}
                </span>
              )}
            </MetaRow>
          )}
          {instructorText && (
            <MetaRow icon={<UserIcon className="w-4 h-4" />} label="With">
              {instructorText}
            </MetaRow>
          )}
        </dl>

        {description && (
          <Section title="About">
            <p className="text-sm text-charcoal-700 leading-relaxed">{description}</p>
          </Section>
        )}

        {(enrollmentNote || personalNote) && (
          <Section title="Your note">
            <p className="text-sm text-charcoal-700 leading-relaxed font-serif italic">
              {enrollmentNote || personalNote}
            </p>
          </Section>
        )}

        {/* Notes feed */}
        <Section
          title={notes.length === 0 ? 'Notes' : `Notes (${notes.length})`}
          subtitle={notes.length === 0 ? undefined : 'Linked to this class.'}
        >
          {notes.length === 0 ? (
            <p className="text-sm text-charcoal-500 italic">
              No notes for this class yet.
            </p>
          ) : (
            <ul className="space-y-8 divide-y divide-champagne-200">
              {notes.map((note, i) => (
                <li key={note.id} className={i === 0 ? '' : 'pt-8'}>
                  <NoteViewContent note={note} currentUserName={currentUserName} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </SheetBody>

      {personal && (onEdit || onDelete) && (
        <SheetFooter>
          {onEdit && (
            <Button variant="outline" onClick={() => onEdit(personal)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(personal)}
              className="bg-rose-700 hover:bg-rose-800 active:bg-rose-900"
            >
              Delete
            </Button>
          )}
        </SheetFooter>
      )}
    </Sheet>
  )
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 text-charcoal-400 mt-0.5" aria-hidden>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd className="text-charcoal-900">{children}</dd>
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="text-xs font-medium uppercase tracking-[0.1em] text-charcoal-500 mb-3">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-charcoal-500 -mt-2 mb-3">{subtitle}</p>
      )}
      {children}
    </section>
  )
}
