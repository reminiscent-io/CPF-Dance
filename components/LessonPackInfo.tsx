'use client'

import { useEffect, useState } from 'react'
import { LessonPackHistory } from '@/components/LessonPackHistory'

interface LessonPackInfoProps {
  selectedPackId?: string
  onPackSelect?: (packId: string, lessons: number) => void
}

export function LessonPackInfo({ }: LessonPackInfoProps) {
  const [totalRemaining, setTotalRemaining] = useState(0)
  const [loading, setLoading] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)

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

  return (
    <>
      <button
        onClick={() => setHistoryOpen(true)}
        className="w-full p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer shadow-sm hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="text-left">
            <p className="text-sm font-medium text-blue-700 mb-1">Available Lessons</p>
            <p className="text-4xl font-bold text-blue-900">{totalRemaining}</p>
            <p className="text-xs text-blue-600 mt-2">Click to view purchase history</p>
          </div>
          <div className="text-4xl">📦</div>
        </div>
      </button>

      <LessonPackHistory isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  )
}
