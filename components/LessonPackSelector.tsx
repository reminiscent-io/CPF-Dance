'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import type { LessonPack, LessonPackPurchase } from '@/lib/types'

interface LessonPackSelectorProps {
  onSelectPack: (packId: string, packName: string, lessons: number) => void
  selectedPackId?: string
}

export function LessonPackSelector({ onSelectPack, selectedPackId }: LessonPackSelectorProps) {
  const [packs, setPacks] = useState<LessonPack[]>([])
  const [purchases, setPurchases] = useState<LessonPackPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPacks()
  }, [])

  const fetchPacks = async () => {
    try {
      const response = await fetch('/api/dancer/lesson-packs')
      if (response.ok) {
        const data = await response.json()
        setPacks(data.packs)
        setPurchases(data.purchases)
      } else {
        setError('Failed to load lesson packs')
      }
    } catch (err) {
      console.error('Error fetching packs:', err)
      setError('Error loading lesson packs')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price)
  }

  const handlePurchase = async (packId: string) => {
    try {
      const response = await fetch('/api/dancer/lesson-packs/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_pack_id: packId })
      })

      if (response.ok) {
        await fetchPacks()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to purchase lesson pack')
      }
    } catch (err) {
      console.error('Error purchasing pack:', err)
      alert('Failed to purchase lesson pack')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎓 Lesson Packs</h3>
        <p className="text-sm text-gray-600 mb-4">
          Purchase a lesson pack to use when requesting private lessons. Each lesson in your pack can be used towards one private lesson request.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {packs.map((pack) => (
          <Card key={pack.id} className={selectedPackId === pack.id ? 'border-rose-500 border-2' : ''}>
            <CardContent className="p-4">
              <div className="text-center">
                <h4 className="text-lg font-bold text-gray-900 mb-1">{pack.lesson_count} Lessons</h4>
                <p className="text-2xl font-bold text-rose-600 mb-3">{formatPrice(pack.price)}</p>
                <p className="text-sm text-gray-600 mb-4">{formatPrice(pack.price / pack.lesson_count)}/lesson</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePurchase(pack.id)}
                  className="w-full"
                >
                  Purchase Pack
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {purchases.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">📦 Your Active Packs</h4>
          <div className="space-y-2">
            {purchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {purchase.lesson_pack?.name || `${purchase.lesson_pack?.lesson_count || '?'} Lesson Pack`}
                      </p>
                      <p className="text-sm text-gray-600">
                        Purchased: {new Date(purchase.purchased_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={purchase.remaining_lessons > 0 ? 'success' : 'danger'}>
                      {purchase.remaining_lessons} lessons remaining
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
