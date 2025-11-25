'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import type { LessonPackPurchase } from '@/lib/types'

interface LessonPackInfoProps {
  selectedPackId?: string
  onPackSelect?: (packId: string, lessons: number) => void
}

export function LessonPackInfo({ selectedPackId, onPackSelect }: LessonPackInfoProps) {
  const [purchases, setPurchases] = useState<LessonPackPurchase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPurchases()
  }, [])

  const fetchPurchases = async () => {
    try {
      const response = await fetch('/api/dancer/lesson-packs')
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases || [])
      }
    } catch (err) {
      console.error('Error fetching purchases:', err)
    } finally {
      setLoading(false)
    }
  }

  const availablePurchases = purchases.filter(p => p.remaining_lessons > 0)

  if (loading) {
    return null
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
        💡 Your Lesson Packs
      </h4>
      
      {availablePurchases.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-blue-800 mb-2">
            {purchases.length === 0 
              ? "You don't have any lesson packs yet." 
              : "No lessons remaining in your packs."}
          </p>
          <p className="text-xs text-blue-700">
            Purchase a lesson pack to get started with private lessons.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availablePurchases.map((purchase) => (
              <button
                key={purchase.id}
                onClick={() => {
                  onPackSelect?.(purchase.id, purchase.lesson_pack?.lesson_count || 1)
                }}
                className={`p-3 rounded border-2 transition-all text-left ${
                  selectedPackId === purchase.id
                    ? 'border-blue-600 bg-blue-100'
                    : 'border-blue-200 hover:border-blue-400 hover:bg-blue-100'
                }`}
              >
                <p className="font-medium text-blue-900">
                  {purchase.lesson_pack?.name || 'Lesson Pack'}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-blue-700">{purchase.remaining_lessons} lessons remaining</span>
                  <Badge variant="primary" size="sm">Use</Badge>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-3">
            When you request a lesson, one lesson from your selected pack will be used automatically.
            If you have no remaining lessons, you'll need to pay for the lesson to proceed.
          </p>
        </>
      )}
    </div>
  )
}
