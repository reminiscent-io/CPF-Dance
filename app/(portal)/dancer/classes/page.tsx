'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Toolbar } from '@/components/ui/Toolbar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useToast } from '@/components/ui/Toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/DropdownMenu'
import { ClassEditSheet, type PersonalClass } from '@/components/dancer/ClassEditSheet'
import { ClassDetailSheet, type DetailClass } from '@/components/dancer/ClassDetailSheet'
import type { Note } from '@/lib/utils/date-helpers'
import {
  formatClassDate,
  formatClassTime,
  formatTimeRange,
  groupClassesByDate,
} from '@/lib/utils/class-dates'
import { useNow } from '@/lib/hooks/use-now'
import { ClockIcon, MapPinIcon, UserIcon, EllipsisHorizontalIcon, PlusIcon } from '@heroicons/react/24/outline'

interface EnrolledClass {
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
  enrollment_id: string
  enrolled_at: string
  attendance_status: string | null
  enrollment_notes: string | null
  instructor_name: string
  studio: {
    name: string
    address: string | null
    city: string | null
    state: string | null
  } | null
  source: 'enrolled'
}

interface PersonalClassRow extends PersonalClass {
  source: 'personal'
}

type CombinedClass = EnrolledClass | PersonalClassRow

type FilterType = 'upcoming' | 'past' | 'all'

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
]

const CLASS_TYPE_LABEL: Record<string, string> = {
  group: 'Group',
  private: 'Private',
  workshop: 'Workshop',
  master_class: 'Master class',
}

export default function DancerClassesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const { addToast } = useToast()

  const [enrolled, setEnrolled] = useState<EnrolledClass[]>([])
  const [personal, setPersonal] = useState<PersonalClassRow[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [filter, setFilter] = useState<FilterType>('upcoming')
  const [editing, setEditing] = useState<PersonalClassRow | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detail, setDetail] = useState<CombinedClass | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<PersonalClassRow | null>(null)
  const [deleting, setDeleting] = useState(false)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'admin' && profile.role !== 'guardian') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  const fetchClasses = useCallback(async () => {
    try {
      const [enrolledRes, personalRes, notesRes] = await Promise.all([
        fetch('/api/dancer/classes'),
        fetch('/api/dancer/personal-classes'),
        fetch('/api/dancer/notes'),
      ])
      if (enrolledRes.ok) {
        const data = await enrolledRes.json()
        setEnrolled(data.classes.map((c: EnrolledClass) => ({ ...c, source: 'enrolled' as const })))
      }
      if (personalRes.ok) {
        const data = await personalRes.json()
        setPersonal(data.classes.map((c: PersonalClass) => ({ ...c, source: 'personal' as const })))
      }
      if (notesRes.ok) {
        const data = await notesRes.json()
        setNotes(data.notes ?? [])
      }
    } catch {
      addToast('Could not load your classes.', 'error')
    } finally {
      setLoadingClasses(false)
    }
  }, [addToast])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchClasses()
    }
  }, [loading, user, profile, fetchClasses])

  const all = useMemo<CombinedClass[]>(
    () =>
      [...enrolled, ...personal].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ),
    [enrolled, personal]
  )

  const now = useNow()

  const filtered = useMemo(() => {
    return all.filter((cls) => {
      const date = new Date(cls.start_time)
      if (filter === 'upcoming') return date >= now
      if (filter === 'past') return date < now
      return true
    })
  }, [all, filter, now])

  const groups = useMemo(
    () =>
      groupClassesByDate(
        filter === 'past' ? [...filtered].reverse() : filtered,
        filter === 'past' ? 'past' : 'upcoming'
      ),
    [filtered, filter]
  )

  async function deletePersonal(cls: PersonalClassRow) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/dancer/personal-classes?id=${cls.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        addToast(err.error || 'Could not delete the class.', 'error')
        return
      }
      addToast('Class removed.', 'success')
      await fetchClasses()
    } catch {
      addToast('Could not delete the class.', 'error')
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <PortalLayout profile={null}>
        <PageHeaderSkeleton />
        <ListSkeleton />
      </PortalLayout>
    )
  }

  if (!user || !profile) return null

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="My Classes"
        subtitle="Your enrolled lessons and the practice you keep on your own."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
            aria-label="Add a class"
            className="gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Add class</span>
          </Button>
        }
      />

      <Toolbar
        filters={
          <SegmentedControl<FilterType>
            aria-label="Filter classes"
            options={FILTERS}
            value={filter}
            onChange={setFilter}
          />
        }
      />

      <div className="mt-toolbar-gap">
        {loadingClasses ? (
          <ListSkeleton />
        ) : groups.length === 0 ? (
          <EmptyState
            filter={filter}
            onAdd={() => {
              setEditing(null)
              setSheetOpen(true)
            }}
            onShowAll={() => setFilter('all')}
          />
        ) : (
          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.key} aria-labelledby={`group-${group.key}`}>
                <h2
                  id={`group-${group.key}`}
                  className="text-sm font-medium tracking-[0.08em] uppercase text-charcoal-500 mb-3"
                >
                  {group.label}
                </h2>
                <ul className="divide-y divide-champagne-200 border-y border-champagne-200">
                  {group.items.map((cls) => (
                    <ClassRow
                      key={`${cls.source}-${cls.id}`}
                      cls={cls}
                      isPast={new Date(cls.start_time) < now}
                      onOpen={(c) => setDetail(c)}
                      onEdit={(c) => {
                        setEditing(c)
                        setSheetOpen(true)
                      }}
                      onDelete={(c) => setDeleteConfirm(c)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <ClassEditSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
        onSaved={fetchClasses}
      />

      <ClassDetailSheet
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        cls={detail as DetailClass | null}
        notes={notes.filter((n) => {
          if (!detail) return false
          if (detail.source === 'enrolled') return n.class_id === detail.id
          return n.personal_class_id === detail.id
        })}
        currentUserName={profile.full_name ?? undefined}
        onEdit={(c) => {
          setDetail(null)
          setEditing(c as PersonalClassRow)
          setSheetOpen(true)
        }}
        onDelete={(c) => {
          setDetail(null)
          setDeleteConfirm(c as PersonalClassRow)
        }}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Delete this class?"
        body={
          deleteConfirm
            ? `${deleteConfirm.title} on ${formatClassDate(deleteConfirm.start_time)} will be removed from your schedule. This cannot be undone.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        tone="destructive"
        busy={deleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && deletePersonal(deleteConfirm)}
      />
    </PortalLayout>
  )
}

interface RowProps {
  cls: CombinedClass
  isPast: boolean
  onOpen: (cls: CombinedClass) => void
  onEdit: (cls: PersonalClassRow) => void
  onDelete: (cls: PersonalClassRow) => void
}

function ClassRow({ cls, isPast, onOpen, onEdit, onDelete }: RowProps) {
  const isPersonal = cls.source === 'personal'
  const personalCls = isPersonal ? cls : null
  const enrolledCls = !isPersonal ? cls : null
  const date = new Date(cls.start_time)
  const cancelled = enrolledCls?.is_cancelled

  const meta: { icon: React.ReactNode; text: string }[] = []
  meta.push({
    icon: <ClockIcon className="w-3.5 h-3.5" />,
    text: enrolledCls?.end_time
      ? formatTimeRange(cls.start_time, enrolledCls.end_time)
      : personalCls?.end_time
        ? formatTimeRange(cls.start_time, personalCls.end_time)
        : formatClassTime(cls.start_time),
  })
  const locationText = enrolledCls
    ? [enrolledCls.studio?.name, enrolledCls.studio?.city].filter(Boolean).join(', ') ||
      enrolledCls.location
    : personalCls?.location
  if (locationText) {
    meta.push({ icon: <MapPinIcon className="w-3.5 h-3.5" />, text: locationText })
  }
  const instructorText = enrolledCls?.instructor_name || personalCls?.instructor_name
  if (instructorText) {
    meta.push({ icon: <UserIcon className="w-3.5 h-3.5" />, text: instructorText })
  }

  const noteText = enrolledCls?.enrollment_notes || personalCls?.notes

  return (
    <li className={`group relative flex items-stretch ${cancelled ? 'opacity-60' : ''}`}>
      <button
        type="button"
        onClick={() => onOpen(cls)}
        aria-label={`View details for ${cls.title}`}
        className="flex flex-1 items-start gap-5 py-5 pr-2 text-left rounded-md -mx-2 px-2 hover:bg-champagne-100/60 focus:outline-none focus-visible:bg-champagne-100/60 focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors"
      >
        {/* Editorial date sidesheet */}
        <div className="flex-shrink-0 w-16 sm:w-20 pt-0.5 text-charcoal-700">
          <div className="text-xs uppercase tracking-[0.1em] text-charcoal-400">
            {date.toLocaleDateString('en-US', { weekday: 'short' })}
          </div>
          <div className="font-serif text-3xl leading-none mt-1 tabular-nums text-charcoal-950">
            {String(date.getDate()).padStart(2, '0')}
          </div>
          <div className="text-xs uppercase tracking-[0.08em] text-charcoal-500 mt-1">
            {date.toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h3
              className={`text-lg font-semibold leading-snug ${
                cancelled ? 'text-charcoal-400 line-through' : 'text-charcoal-950'
              }`}
            >
              {cls.title}
            </h3>
            {enrolledCls && <ClassTypeChip type={enrolledCls.class_type} />}
            {cancelled && <StatusChip tone="rose">Cancelled</StatusChip>}
            {isPast && enrolledCls?.attendance_status && (
              <AttendanceChip status={enrolledCls.attendance_status} />
            )}
          </div>

          <dl className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-charcoal-600">
            {meta.map((m, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-charcoal-400" aria-hidden>
                  {m.icon}
                </span>
                <dd className="tabular-nums">{m.text}</dd>
              </div>
            ))}
          </dl>

          {noteText && (
            <p className="mt-3 text-sm text-charcoal-700 italic font-serif line-clamp-2">
              {noteText}
            </p>
          )}

          {enrolledCls?.description && !noteText && (
            <p className="mt-2 text-sm text-charcoal-600 line-clamp-2">
              {enrolledCls.description}
            </p>
          )}
        </div>
      </button>

      {/* Personal-class actions — outside the row button so its trigger
          doesn't double-fire onOpen */}
      {personalCls && (
        <div className="flex-shrink-0 self-start pt-3.5 -mr-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center w-11 h-11 rounded-md text-charcoal-500 hover:text-charcoal-900 hover:bg-champagne-100 transition-colors"
              aria-label={`Actions for ${cls.title}`}
            >
              <EllipsisHorizontalIcon className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(personalCls)}>Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={() => onDelete(personalCls)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </li>
  )
}

function ClassTypeChip({ type }: { type: string }) {
  const isPremium = type === 'master_class'
  const label = CLASS_TYPE_LABEL[type] ?? type.replace('_', ' ')
  return (
    <span
      className={`
        inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase
        px-2 py-0.5 rounded-sm
        ${isPremium
          ? 'bg-gold-100 text-gold-800'
          : 'bg-champagne-100 text-charcoal-600'
        }
      `}
    >
      {label}
    </span>
  )
}

function StatusChip({
  tone,
  children,
}: {
  tone: 'rose' | 'gold' | 'neutral'
  children: React.ReactNode
}) {
  const styles = {
    rose: 'bg-rose-100 text-rose-700',
    gold: 'bg-gold-100 text-gold-800',
    neutral: 'bg-champagne-100 text-charcoal-600',
  }
  return (
    <span className={`inline-flex items-center text-[11px] font-medium tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm ${styles[tone]}`}>
      {children}
    </span>
  )
}

function AttendanceChip({ status }: { status: string }) {
  // present → gold (positive milestone), absent/late → rose, excused → neutral.
  const tone: 'rose' | 'gold' | 'neutral' =
    status === 'present' ? 'gold' : status === 'excused' ? 'neutral' : 'rose'
  return <StatusChip tone={tone}>{status}</StatusChip>
}

function EmptyState({
  filter,
  onAdd,
  onShowAll,
}: {
  filter: FilterType
  onAdd: () => void
  onShowAll: () => void
}) {
  const copy = {
    upcoming: {
      title: 'Nothing scheduled.',
      body: 'When Courtney sets a class, or when you add one of your own, it will appear here.',
    },
    past: {
      title: 'No past classes.',
      body: 'Once you have attended a class, it will live here as part of your record.',
    },
    all: {
      title: 'Your schedule is empty.',
      body: 'Track classes you take outside of lessons with Courtney, or wait for an enrollment to arrive.',
    },
  }[filter]

  return (
    <div className="border-y border-champagne-200 py-16 text-center">
      <h3 className="font-serif text-2xl text-charcoal-950">{copy.title}</h3>
      <p className="mt-2 max-w-md mx-auto text-charcoal-500">{copy.body}</p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button onClick={onAdd}>Add a class</Button>
        {filter !== 'all' && (
          <Button variant="outline" onClick={onShowAll}>
            View everything
          </Button>
        )}
      </div>
    </div>
  )
}

function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div className="space-y-2">
        <div className="h-9 w-48 rounded bg-champagne-100 animate-pulse" />
        <div className="h-4 w-72 rounded bg-champagne-100 animate-pulse" />
      </div>
      <div className="h-11 w-28 rounded bg-champagne-100 animate-pulse" />
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-10">
      {[0, 1].map((g) => (
        <div key={g}>
          <div className="h-3 w-24 rounded bg-champagne-100 animate-pulse mb-3" />
          <ul className="divide-y divide-champagne-200 border-y border-champagne-200">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-start gap-5 py-5">
                <div className="w-16 sm:w-20 space-y-1.5">
                  <div className="h-3 w-10 rounded bg-champagne-100 animate-pulse" />
                  <div className="h-7 w-12 rounded bg-champagne-100 animate-pulse" />
                  <div className="h-3 w-10 rounded bg-champagne-100 animate-pulse" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-2/3 rounded bg-champagne-100 animate-pulse" />
                  <div className="h-4 w-1/2 rounded bg-champagne-100 animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
