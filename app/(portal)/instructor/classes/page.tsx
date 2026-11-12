'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Button,
  EmptyState,
  PageHeader,
  PageSkeleton,
  SegmentedControl,
  Select,
  SkeletonList,
  Toolbar,
  useToast
} from '@/components/ui'
import { CalendarDaysIcon, PlusIcon } from '@heroicons/react/24/outline'
import type { Class, Studio, CreateClassData, ClassType } from '@/lib/types'
import { etDayKey } from '@/lib/utils/et-timezone'
import { useNow } from '@/lib/hooks/use-now'
import { ClassAgendaRow, type RowWeight } from '@/components/instructor/classes/ClassAgendaRow'
import { CreateClassModal } from '@/components/instructor/classes/CreateClassModal'
import { EditClassModal } from '@/components/instructor/classes/EditClassModal'
import { ET } from '@/components/instructor/classes/class-helpers'

/**
 * Loaders that return data instead of setting state, so mount effects and the
 * various refresh handlers can share them and own their own setState.
 */
async function loadClasses(filters: { filterStudio: string; filterType: string; upcomingOnly: boolean }) {
  const params = new URLSearchParams()
  if (filters.filterStudio) params.append('studio_id', filters.filterStudio)
  if (filters.filterType) params.append('class_type', filters.filterType)
  if (filters.upcomingOnly) params.append('upcoming', 'true')

  const response = await fetch(`/api/classes?${params}`)
  if (!response.ok) throw new Error('Failed to fetch classes')
  const data = await response.json()
  return data.classes || []
}

async function loadActiveStudios() {
  const response = await fetch('/api/studios?is_active=true')
  if (!response.ok) throw new Error('Failed to fetch studios')
  const data = await response.json()
  return data.studios || []
}

function ClassesContent() {
  const { user, profile, loading: authLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToast()

  const [classes, setClasses] = useState<Class[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  // ?create=true is a one-shot instruction from a deep link with no data
  // dependency, so it seeds the initial value instead of being applied by an
  // effect after first paint.
  const [showCreateModal, setShowCreateModal] = useState(
    () => searchParams?.get('create') === 'true'
  )
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)
  const [filterStudio, setFilterStudio] = useState<string>('')
  const [filterType, setFilterType] = useState<ClassType | ''>('')
  const [upcomingOnly, setUpcomingOnly] = useState(true)

  // Sort chronologically so the page reads top-to-bottom like a season's program,
  // then break the run into month sections that anchor the eye.
  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [classes]
  )

  // Group the chronological run into months, then days. The month is the
  // serif heading of the program; days are labelled rules; classes are rows.
  const monthGroups = useMemo(() => {
    type DayBucket = { dayKey: string; weekday: string; dayNum: string; classes: Class[] }
    const months = new Map<
      string,
      { key: string; month: string; year: string; count: number; dayMap: Map<string, DayBucket> }
    >()
    for (const cls of sortedClasses) {
      const date = new Date(cls.start_time)
      const month = date.toLocaleString('en-US', { timeZone: ET, month: 'long' })
      const year = date.toLocaleString('en-US', { timeZone: ET, year: 'numeric' })
      const mm = date.toLocaleString('en-US', { timeZone: ET, month: '2-digit' })
      const monthKey = `${year}-${mm}`
      if (!months.has(monthKey)) months.set(monthKey, { key: monthKey, month, year, count: 0, dayMap: new Map() })
      const m = months.get(monthKey)!
      m.count++
      const dayKey = etDayKey(date)
      if (!m.dayMap.has(dayKey)) {
        m.dayMap.set(dayKey, {
          dayKey,
          weekday: date.toLocaleString('en-US', { timeZone: ET, weekday: 'short' }),
          dayNum: date.toLocaleString('en-US', { timeZone: ET, day: 'numeric' }),
          classes: [],
        })
      }
      m.dayMap.get(dayKey)!.classes.push(cls)
    }
    return [...months.values()].map((m) => ({
      key: m.key,
      month: m.month,
      year: m.year,
      count: m.count,
      days: [...m.dayMap.values()],
    }))
  }, [sortedClasses])

  // "Now" anchors the temporal hierarchy; the ET day keys label Today / Tomorrow.
  // Ticking keeps those labels honest across midnight in a tab left open.
  const now = useNow()
  const nowTs = now.getTime()
  const todayKey = etDayKey(now)
  const tomorrowKey = etDayKey(new Date(nowTs + 86_400_000))

  // The class nearest to now (first upcoming, else the most recent) is the scroll target.
  const nearestClassId = useMemo(() => {
    if (sortedClasses.length === 0) return null
    const upcoming = sortedClasses.find((cls) => new Date(cls.start_time).getTime() >= nowTs)
    return (upcoming ?? sortedClasses[sortedClasses.length - 1]).id
  }, [sortedClasses, nowTs])

  const currentMonthKey = `${now.toLocaleString('en-US', { timeZone: ET, year: 'numeric' })}-${now.toLocaleString('en-US', { timeZone: ET, month: '2-digit' })}`

  const scrollToNearestClass = () => {
    if (!nearestClassId) return
    const el = document.getElementById(`class-card-${nearestClassId}`)
    if (!el) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
    const ring = ['ring-2', 'ring-rose-400', 'ring-offset-2', 'ring-offset-champagne-50']
    el.classList.add(...ring)
    window.setTimeout(() => el.classList.remove(...ring), 1400)
  }

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'instructor' && profile.role !== 'admin') {
      router.push('/dancer')
    }
  }, [authLoading, profile, router])

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false

    const run = async () => {
      try {
        const loaded = await loadClasses({ filterStudio, filterType, upcomingOnly })
        if (!cancelled) setClasses(loaded)
      } catch (error) {
        console.error('Error fetching classes:', error)
        if (!cancelled) addToast('Failed to load classes', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }

      try {
        const loaded = await loadActiveStudios()
        if (!cancelled) setStudios(loaded)
      } catch (error) {
        console.error('Error fetching studios:', error)
      }
    }

    run()
    return () => { cancelled = true }
  }, [user?.id, filterStudio, filterType, upcomingOnly, addToast])

  // ?class_id= cannot seed initial state the way ?create= does: the class it
  // names only exists once the list has loaded. This genuinely waits on async
  // data, and stripping the parameter must not un-derive the open modal, so
  // the state is set once when the class arrives.
  useEffect(() => {
    const classId = searchParams?.get('class_id')
    if (!classId || showEditModal) return

    const classToShow = classes.find(c => c.id === classId)
    if (!classToShow) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reacting to a deep link once its target has loaded; the parameter is stripped below so this cannot re-fire.
    setSelectedClass(classToShow)
    setShowEditModal(true)
    router.replace('/instructor/classes', { scroll: false })
  }, [searchParams, classes, showEditModal, router])

  // Strip ?create= so a refresh or a back navigation doesn't reopen it.
  useEffect(() => {
    if (searchParams?.get('create') === 'true') {
      router.replace('/instructor/classes', { scroll: false })
    }
  }, [searchParams, router])

  const refreshStudios = async () => {
    try {
      setStudios(await loadActiveStudios())
    } catch (error) {
      console.error('Error fetching studios:', error)
    }
  }

  const handleCreateClass = async (formData: CreateClassData & { newStudioName?: string; recurringClasses?: CreateClassData[] }) => {
    try {
      let studioId = formData.studio_id

      // If a new studio name is provided, create it first
      if (formData.newStudioName && formData.newStudioName.trim()) {
        const studioResponse = await fetch('/api/studios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.newStudioName.trim(),
            is_active: true
          })
        })

        if (!studioResponse.ok) {
          const errorData = await studioResponse.json()
          throw new Error(errorData.error || 'Failed to create studio')
        }

        const { studio } = await studioResponse.json()
        studioId = studio.id

        // Refresh studios list
        refreshStudios()
        addToast(`Studio "${formData.newStudioName}" created successfully`, 'success')
      }

      // Check if this is a recurring class submission
      if (formData.recurringClasses && formData.recurringClasses.length > 0) {
        // Create multiple classes
        const classesToCreate = formData.recurringClasses.map(classItem => ({
          ...classItem,
          studio_id: studioId
        }))

        // Use bulk creation endpoint
        const response = await fetch('/api/classes/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classes: classesToCreate, link_series: true })
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('API Error:', errorData)
          throw new Error(errorData.error || 'Failed to create classes')
        }

        const { classes: newClasses, meet } = await response.json()
        const total = newClasses.length
        setClasses(prev => [
          ...(total > 1
            ? newClasses.map((cls: Class, index: number) => ({ ...cls, series_position: index + 1, series_total: total }))
            : newClasses),
          ...prev
        ])
        setShowCreateModal(false)
        const noun = formData.class_type === 'private' ? 'lessons' : formData.class_type === 'workshop' ? 'workshop days' : 'classes'
        addToast(`${newClasses.length} ${noun} created successfully`, 'success')
        if (meet?.failed > 0) {
          addToast(
            `Google Meet links couldn't be created for ${meet.failed} of these lessons. Open each one to add a link manually.`,
            'warning'
          )
        }
        if (meet?.created > 0 && !meet.dancerHasEmail) {
          addToast(
            'This dancer has no email on file, so they were not sent calendar invites. Open each lesson to copy its Google Meet link and share it manually.',
            'warning'
          )
        }
        return
      }

      // Create a single class
      const classData = { ...formData, studio_id: studioId }
      delete classData.newStudioName // Remove the temporary field
      delete classData.recurringClasses // Remove the recurring field

      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to create class')
      }

      const { class: newClass, meet } = await response.json()
      setClasses(prev => [newClass, ...prev])
      setShowCreateModal(false)
      addToast('Class created successfully', 'success')
      if (meet?.url && !meet.dancerHasEmail) {
        addToast(
          'This dancer has no email on file, so they were not notified. Open the lesson to copy the Google Meet link and share it manually.',
          'warning'
        )
      }
    } catch (error) {
      console.error('Error creating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create class'
      addToast(errorMessage, 'error')
    }
  }

  const reloadClasses = async () => {
    try {
      setClasses(await loadClasses({ filterStudio, filterType, upcomingOnly }))
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  const handleUpdateClass = async (
    classId: string,
    formData: CreateClassData & { newStudioName?: string },
    applyToSeries = false
  ) => {
    try {
      let studioId = formData.studio_id

      // If a new studio name is provided, create it first
      if (formData.newStudioName && formData.newStudioName.trim()) {
        const studioResponse = await fetch('/api/studios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.newStudioName.trim(),
            is_active: true
          })
        })

        if (!studioResponse.ok) {
          const errorData = await studioResponse.json()
          throw new Error(errorData.error || 'Failed to create studio')
        }

        const { studio } = await studioResponse.json()
        studioId = studio.id

        // Refresh studios list
        refreshStudios()
        addToast(`Studio "${formData.newStudioName}" created successfully`, 'success')
      }

      // Update the class with the studio_id (either selected or newly created)
      const classData = { ...formData, studio_id: studioId }
      delete classData.newStudioName // Remove the temporary field

      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...classData, apply_to_series: applyToSeries })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to update class')
      }

      const { class: updatedClass, meet, series_updated } = await response.json()
      if (series_updated > 0) {
        await reloadClasses()
      } else {
        // Keep the "Day 2 of 3" numbering the list computed; the PATCH response doesn't carry it
        setClasses(prev => prev.map(cls => cls.id === classId
          ? { ...updatedClass, series_position: cls.series_position, series_total: cls.series_total }
          : cls))
      }
      setShowEditModal(false)
      setSelectedClass(null)
      addToast(
        series_updated > 0
          ? `Class updated, along with ${series_updated} other ${series_updated === 1 ? 'day' : 'days'}`
          : 'Class updated successfully',
        'success'
      )
      if (meet?.url && !meet.dancerHasEmail) {
        addToast(
          'This dancer has no email on file, so they were not notified. Reopen the lesson to copy the Google Meet link and share it manually.',
          'warning'
        )
      }
    } catch (error) {
      console.error('Error updating class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update class'
      addToast(errorMessage, 'error')
    }
  }

  // The edit modal confirms before calling this
  const handleDeleteClass = async (classId: string, scope: 'single' | 'series') => {
    try {
      const response = await fetch(`/api/classes/${classId}${scope === 'series' ? '?scope=series' : ''}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete class')
      }

      const { deleted_ids } = await response.json()
      const deleted = new Set<string>(deleted_ids || [classId])
      setShowEditModal(false)
      setSelectedClass(null)
      // Remaining days of a series need renumbering, so refetch rather than filter
      if (selectedClass?.series_id) {
        await reloadClasses()
      } else {
        setClasses(prev => prev.filter(cls => !deleted.has(cls.id)))
      }
      addToast(deleted.size > 1 ? `${deleted.size} classes deleted` : 'Class deleted successfully', 'success')
    } catch (error) {
      console.error('Error deleting class:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete class'
      addToast(errorMessage, 'error')
    }
  }

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls)
    setShowEditModal(true)
  }

  if (authLoading || !profile || (profile.role !== 'instructor' && profile.role !== 'admin')) {
    return (
      <PortalLayout profile={profile}>
        <PageSkeleton variant="list" withAction withToolbar />
      </PortalLayout>
    )
  }

  // Quiet empty-state copy that matches the active filters
  let emptyStateMessage = 'No classes on the schedule yet.'
  if (filterStudio || filterType) {
    emptyStateMessage = 'No classes match this view.'
  } else if (upcomingOnly) {
    emptyStateMessage = 'No upcoming classes on the schedule.'
  }

  return (
    <PortalLayout profile={profile}>
      <PageHeader
        title="Classes"
        subtitle="Manage your class schedule"
        action={
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="w-5 h-5 mr-1.5" aria-hidden="true" />
            Create class
          </Button>
        }
      />

      <Toolbar
        filters={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-44">
              <Select
                aria-label="Filter classes by studio"
                value={filterStudio}
                onChange={(e) => setFilterStudio(e.target.value)}
                options={[
                  { value: '', label: 'All Studios' },
                  ...studios.map(studio => ({ value: studio.id, label: studio.name }))
                ]}
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                aria-label="Filter classes by type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as ClassType | '')}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'group', label: 'Group' },
                  { value: 'private', label: 'Private' },
                  { value: 'workshop', label: 'Workshop' },
                  { value: 'master_class', label: 'Master Class' },
                  { value: 'competition_choreography', label: 'Competition Choreography' }
                ]}
              />
            </div>
            <SegmentedControl<'upcoming' | 'all'>
              aria-label="Filter classes by time"
              options={[
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'all', label: 'All' }
              ]}
              value={upcomingOnly ? 'upcoming' : 'all'}
              onChange={(value) => setUpcomingOnly(value === 'upcoming')}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToNearestClass}
              disabled={!nearestClassId}
              title="Jump to the class nearest to today"
            >
              <CalendarDaysIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Today
            </Button>
          </div>
        }
      />

      <div className="mt-toolbar-gap">
        {loading ? (
          <SkeletonList count={6} />
        ) : classes.length === 0 ? (
          <div className="rounded-lg border border-champagne-200 bg-champagne-50">
            <EmptyState icon={<CalendarDaysIcon />} message={emptyStateMessage} />
          </div>
        ) : (
          <div className="space-y-10">
            {monthGroups.map((group) => (
              <section key={group.key}>
                {/* Program-section divider: pins to the top of the scroll area so the
                    current month is always legible while paging through the schedule. */}
                <div className="sticky top-0 z-10 bg-champagne-50 pt-2 pb-2">
                  <div className="flex items-baseline justify-between gap-3 border-b border-champagne-200 pb-2">
                    <h2 className="flex items-baseline gap-2.5">
                      <span className="font-serif text-2xl font-semibold tracking-[-0.02em] text-charcoal-950">
                        {group.month}
                      </span>
                      <span className="font-serif text-2xl font-normal text-charcoal-400">
                        {group.year}
                      </span>
                      {group.key === currentMonthKey && (
                        <span className="ml-0.5 rounded-sm bg-rose-50 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-[0.06em] text-rose-700">
                          This month
                        </span>
                      )}
                    </h2>
                    <span className="shrink-0 text-sm text-charcoal-500 tabular-nums">
                      {group.count} {group.count === 1 ? 'class' : 'classes'}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  {group.days.map((day) => {
                    const relative =
                      day.dayKey === todayKey ? 'Today' : day.dayKey === tomorrowKey ? 'Tomorrow' : null
                    return (
                      <div key={day.dayKey} className="mt-5 first:mt-3">
                        {/* Day rule: a labelled hairline, the program's running order */}
                        <div className="flex items-center gap-3 pb-0.5">
                          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-charcoal-500">
                            {day.weekday} {day.dayNum}
                            {relative && (
                              <span className={relative === 'Today' ? 'text-rose-700' : 'text-charcoal-400'}>
                                {' · '}
                                {relative}
                              </span>
                            )}
                          </span>
                          <span className="h-px flex-1 bg-champagne-200" aria-hidden="true" />
                        </div>

                        <div className="divide-y divide-champagne-200/70">
                          {day.classes.map((cls) => {
                            const startTs = new Date(cls.start_time).getTime()
                            const endTs = new Date(cls.end_time).getTime()
                            let weight: RowWeight
                            if (endTs < nowTs) weight = 'past'
                            else if (day.dayKey === todayKey || cls.id === nearestClassId) weight = 'hero'
                            else weight = startTs - nowTs > 21 * 86_400_000 ? 'far' : 'normal'
                            return (
                              <ClassAgendaRow
                                key={cls.id}
                                cls={cls}
                                weight={weight}
                                isNext={cls.id === nearestClassId && endTs >= nowTs}
                                onClick={() => handleClassClick(cls)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateClassModal
          studios={studios}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateClass}
        />
      )}

      {showEditModal && selectedClass && (
        <EditClassModal
          classData={selectedClass}
          studios={studios}
          onClose={() => {
            setShowEditModal(false)
            setSelectedClass(null)
          }}
          onSubmit={(formData, applyToSeries) => handleUpdateClass(selectedClass.id, formData, applyToSeries)}
          onDelete={(scope) => handleDeleteClass(selectedClass.id, scope)}
        />
      )}
    </PortalLayout>
  )
}

export default function ClassesPage() {
  return (
    <Suspense fallback={
      <PortalLayout profile={null}>
        <PageSkeleton variant="list" withAction withToolbar />
      </PortalLayout>
    }>
      <ClassesContent />
    </Suspense>
  )
}
