'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { NoteFeedItem } from '@/components/notes/NoteFeedItem'
import { NoteViewContent } from '@/components/notes/NoteViewContent'
import {
  CalendarIcon,
  DocumentTextIcon,
  ClockIcon,
  MapPinIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import ReviewModal from '@/components/ReviewModal'

interface DancerStats {
  upcoming_classes: number
  total_classes_attended: number
  recent_notes: number
}

interface UpcomingClass {
  id: string
  title: string
  description: string
  location: string
  start_time: string
  end_time: string
  class_type: string
  studios: {
    name: string
  } | null
}

interface RecentNote {
  id: string
  title: string | null
  content: string
  tags: string[] | null
  created_at: string
  author_id: string
  author_name: string
  author_avatar_url: string | null
  is_personal: boolean
  class_id: string | null
  classes: {
    title: string
  } | null
}

export default function DancerPortalPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [stats, setStats] = useState<DancerStats | null>(null)
  const [upcomingClasses, setUpcomingClasses] = useState<UpcomingClass[]>([])
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [viewingNote, setViewingNote] = useState<RecentNote | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [hasReviews, setHasReviews] = useState(false)
  const hasFetched = useRef(false)

  useEffect(() => {
    if (!loading && profile && profile.role !== 'dancer' && profile.role !== 'guardian' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'studio'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile && !hasFetched.current) {
      hasFetched.current = true
      fetchDashboardData()
    }
  }, [loading, user, profile])

  const fetchDashboardData = async () => {
    try {
      const [statsRes, reviewsRes] = await Promise.all([
        fetch('/api/dancer/stats'),
        fetch('/api/dancer/reviews'),
      ])
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
        setUpcomingClasses(data.upcoming_classes || [])
        setRecentNotes(data.recent_notes || [])
      }
      if (reviewsRes.ok) {
        const data = await reviewsRes.json()
        setHasReviews((data.data || []).length > 0)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const handleNoteClick = (note: RecentNote) => {
    setViewingNote(note)
    setShowViewModal(true)
  }

  const handleCloseViewModal = () => {
    setShowViewModal(false)
    setViewingNote(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-champagne-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-charcoal-500 mt-4">Loading…</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const firstName = (profile.full_name || '').split(' ')[0] || profile.full_name

  const showProfilePrompt = !profile.avatar_url
  const showReviewPrompt = !hasReviews
  const showFooterPrompts = showProfilePrompt || showReviewPrompt

  return (
    <PortalLayout profile={profile}>
      <div className="space-y-8">
        <PageHeader title={firstName} subtitle={today} />

        {loadingData ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* Notes — primary surface, two-thirds */}
            <section className="lg:col-span-2">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-serif italic text-xl text-charcoal-950 tracking-[-0.01em]">
                  Recent notes
                </h2>
                <button
                  onClick={() => router.push('/dancer/notes')}
                  className="text-sm text-rose-700 hover:text-rose-800 flex items-center gap-1 tracking-[0.04em]"
                >
                  All notes
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>

              {recentNotes.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {recentNotes.map((note) => (
                    <NoteFeedItem
                      key={note.id}
                      note={note as any}
                      onEdit={() => handleNoteClick(note)}
                      currentUserName={profile?.full_name || undefined}
                      showActions={false}
                      density="compact"
                    />
                  ))}
                </div>
              ) : (
                <div className="border border-champagne-200 border-dashed rounded-lg p-8 text-center bg-champagne-100/50">
                  <DocumentTextIcon className="w-10 h-10 text-charcoal-400 mx-auto mb-3" />
                  <p className="text-charcoal-700 mb-4">
                    No notes yet. Courtney's feedback will appear here after your next lesson.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dancer/notes')}
                  >
                    Open notes
                  </Button>
                </div>
              )}
            </section>

            {/* Right column — upcoming classes only, no KPI tiles */}
            <section>
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-serif italic text-xl text-charcoal-950 tracking-[-0.01em]">
                  Upcoming
                </h2>
                <button
                  onClick={() => router.push('/dancer/classes')}
                  className="text-sm text-rose-700 hover:text-rose-800 flex items-center gap-1 tracking-[0.04em]"
                >
                  All classes
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>

              {upcomingClasses.length > 0 ? (
                <div className="space-y-3">
                  {/* Mobile: show only the next class */}
                  <div className="md:hidden">
                    {(() => {
                      const classItem = upcomingClasses[0]
                      const { date, time } = formatDateTime(classItem.start_time)
                      return (
                        <Card
                          hover
                          padding="none"
                          className="cursor-pointer"
                          onClick={() => router.push('/dancer/classes')}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-base text-charcoal-950 truncate" style={{ fontWeight: 600 }}>
                                  {classItem.title}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-charcoal-500 mt-1">
                                  <span className="flex items-center gap-1">
                                    <ClockIcon className="w-3.5 h-3.5" />
                                    {date}, {time}
                                  </span>
                                  {(classItem.studios?.name || classItem.location) && (
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                                      <span className="truncate">{classItem.studios?.name || classItem.location}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRightIcon className="w-4 h-4 text-charcoal-300 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })()}
                    {upcomingClasses.length > 1 && (
                      <p className="text-xs text-charcoal-400 mt-2 text-center">
                        +{upcomingClasses.length - 1} more upcoming
                      </p>
                    )}
                  </div>

                  {/* Desktop: list */}
                  <div className="hidden md:flex md:flex-col md:gap-3">
                    {upcomingClasses.slice(0, 5).map((classItem) => {
                      const { date, time } = formatDateTime(classItem.start_time)
                      return (
                        <Card
                          key={classItem.id}
                          hover
                          padding="none"
                          className="cursor-pointer"
                          onClick={() => router.push('/dancer/classes')}
                        >
                          <CardContent className="p-4">
                            <h3 className="text-base text-charcoal-950 truncate" style={{ fontWeight: 600 }}>
                              {classItem.title}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-charcoal-500 mt-1.5">
                              <span className="flex items-center gap-1.5">
                                <ClockIcon className="w-4 h-4" />
                                {date}, {time}
                              </span>
                              {(classItem.studios?.name || classItem.location) && (
                                <span className="flex items-center gap-1.5 truncate">
                                  <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                                  <span className="truncate">{classItem.studios?.name || classItem.location}</span>
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="border border-champagne-200 border-dashed rounded-lg p-8 text-center bg-champagne-100/50">
                  <CalendarIcon className="w-10 h-10 text-charcoal-400 mx-auto mb-3" />
                  <p className="text-charcoal-700 mb-4">
                    No classes on the calendar yet.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dancer/classes')}
                  >
                    Browse classes
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Quiet program-page footer — profile + review prompts as text links, no banners */}
        {showFooterPrompts && (
          <footer className="border-t border-champagne-200 pt-5 mt-2 flex flex-col sm:flex-row sm:items-center sm:gap-8 gap-3 text-sm text-charcoal-500">
            {showProfilePrompt && (
              <Link
                href="/dancer/profile"
                className="hover:text-rose-800 transition-colors"
              >
                Add a profile photo
                <span className="text-charcoal-300 mx-2">·</span>
                <span className="text-charcoal-400">so Courtney recognizes you</span>
              </Link>
            )}
            {showReviewPrompt && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="text-left hover:text-rose-800 transition-colors"
              >
                Leave a review
                <span className="text-charcoal-300 mx-2">·</span>
                <span className="text-charcoal-400">a few words about working with Courtney</span>
              </button>
            )}
          </footer>
        )}
      </div>

      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onReviewSubmitted={() => setHasReviews(true)}
      />

      <Modal
        isOpen={showViewModal}
        onClose={handleCloseViewModal}
        title={viewingNote?.is_personal ? 'Your note' : 'From Courtney'}
      >
        {viewingNote && (
          <NoteViewContent
            note={viewingNote as any}
            currentUserName={profile?.full_name || undefined}
            footerSlot={
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    router.push(`/dancer/notes?tab=${viewingNote.is_personal ? 'personal' : 'instructor'}`)
                  }
                >
                  View all notes
                </Button>
                <Button onClick={handleCloseViewModal}>Close</Button>
              </>
            }
          />
        )}
      </Modal>
    </PortalLayout>
  )
}
