'use client'

import { useEffect, useState } from 'react'
import { LessonPackHistory } from '@/components/LessonPackHistory'
import { LessonPackSelector } from '@/components/LessonPackSelector'
import { Button } from '@/components/ui/Button'

interface LessonPackInfoProps {
  selectedPackId?: string
  onPackSelect?: (packId: string, lessons: number) => void
  instructorId?: string | null
}

export function LessonPackInfo({ instructorId }: LessonPackInfoProps) {
  const [totalRemaining, setTotalRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)

  useEffect(() => {
    fetchTotalLessons()
  }, [])

  const fetchTotalLessons = async () => {
    try {
      const response = await fetch('/api/dancer/lesson-packs/history')
      if (response.ok) {
        const data = await response.json()
        setTotalRemaining(data.totalRemaining || 0)
      }
    } catch (err) {
      console.error('Error fetching total lessons:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  if (showPurchaseOptions) {
    return (
      <div className="space-y-4">
        <Button 
          variant="outline" 
          onClick={() => setShowPurchaseOptions(false)}
          className="mb-4"
        >
          ← Back
        </Button>
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">🎓 Available Lesson Packs</h4>
          <p className="text-sm text-blue-700 mb-3">
            Purchase a pack to use when requesting private lessons
          </p>
        </div>
        <LessonPackSelector
          onSelectPack={() => {
            setShowPurchaseOptions(false)
            fetchTotalLessons()
          }}
          instructorId={instructorId}
        />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <button
          onClick={() => setHistoryOpen(true)}
          className="w-full p-2 md:p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer shadow-sm hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-medium text-blue-700 mb-0.5">Available Lessons</p>
              <p className="text-xl md:text-3xl font-bold text-blue-900">{totalRemaining}</p>
              <p className="text-xs text-blue-600 mt-1">Click to view history</p>
            </div>
            <div className="text-xl md:text-3xl">📦</div>
          </div>
        </button>

        <Button
          variant="secondary"
          onClick={() => setShowPurchaseOptions(true)}
          className="w-full"
        >
          + Buy More Lessons
        </Button>
      </div>

      <LessonPackHistory isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  )
}
