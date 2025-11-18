'use client'

import { useUser } from '@/lib/auth/hooks'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PortalLayout } from '@/components/PortalLayout'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

interface ClassData {
  id: string
  title: string
  description: string | null
  location: string | null
  start_time: string
  end_time: string
  class_type: string
  is_cancelled: boolean
  instructor_name: string
  max_capacity: number | null
  enrolled_count: number
}

type FilterType = 'all' | 'upcoming' | 'past'

export default function StudioClassesPage() {
  const { user, profile, loading } = useUser()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassData[]>([])
  const [loadingClasses, setLoadingClasses] = useState(true)
  const [filter, setFilter] = useState<FilterType>('upcoming')

  useEffect(() => {
    if (!loading && profile && profile.role !== 'studio' && profile.role !== 'admin') {
      router.push(`/${profile.role === 'instructor' ? 'instructor' : 'dancer'}`)
    }
  }, [loading, profile, router])

  useEffect(() => {
    if (!loading && user && profile) {
      fetchClasses()
    }
  }, [loading, user, profile])

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/studio/classes')
      if (response.ok) {
        const data = await response.json()
        setClasses(data.classes)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoadingClasses(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile || profile.role !== 'studio' && profile.role !== 'admin') {
    return null
  }

  const now = new Date()
  const filteredClasses = classes.filter((cls) => {
    const classDate = new Date(cls.start_time)
    if (filter === 'upcoming') return classDate >= now && !cls.is_cancelled
    if (filter === 'past') return classDate < now
    return true
  })

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }
  }

  const getClassTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      group: 'bg-blue-100 text-blue-800',
      private: 'bg-purple-100 text-purple-800',
      workshop: 'bg-green-100 text-green-800',
      master_class: 'bg-rose-100 text-rose-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <PortalLayout profile={profile}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Classes</h1>
        <p className="text-gray-600">View all classes at your studio</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={filter === 'upcoming' ? 'primary' : 'outline'}
          onClick={() => setFilter('upcoming')}
        >
          Upcoming
        </Button>
        <Button
          variant={filter === 'past' ? 'primary' : 'outline'}
          onClick={() => setFilter('past')}
        >
          Past
        </Button>
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
        >
          All
        </Button>
      </div>

      {loadingClasses ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredClasses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const { date, time } = formatDateTime(cls.start_time)
            const isPast = new Date(cls.start_time) < now

            return (
              <Card key={cls.id} hover className="flex flex-col">
                <CardContent className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {cls.title}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getClassTypeColor(
                          cls.class_type
                        )}`}
                      >
                        {cls.class_type.replace('_', ' ')}
                      </span>
                    </div>
                    {cls.is_cancelled && (
                      <Badge variant="danger" size="sm">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  {cls.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {cls.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">📅</span>
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">⏰</span>
                      <span>{time}</span>
                    </div>
                    {cls.location && (
                      <div className="flex items-center text-gray-700">
                        <span className="mr-2">📍</span>
                        <span>{cls.location}</span>
                      </div>
                    )}
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">👤</span>
                      <span>Instructor: {cls.instructor_name}</span>
                    </div>
                    <div className="flex items-center text-gray-700">
                      <span className="mr-2">👥</span>
                      <span>
                        Enrolled: {cls.enrolled_count}
                        {cls.max_capacity && ` / ${cls.max_capacity}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'upcoming' && 'No Upcoming Classes'}
              {filter === 'past' && 'No Past Classes'}
              {filter === 'all' && 'No Classes Yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'upcoming' &&
                'There are no upcoming classes scheduled at your studio.'}
              {filter === 'past' && 'There are no past classes to display.'}
              {filter === 'all' &&
                'No classes have been scheduled at your studio yet.'}
            </p>
            {filter !== 'all' && (
              <Button variant="outline" onClick={() => setFilter('all')}>
                View All Classes
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </PortalLayout>
  )
}
