'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'

interface ExtendedPurchase {
  id: string
  student_id: string
  lesson_pack_id: string
  remaining_lessons: number
  purchased_at: string
  lesson_pack?: {
    id: string
    name: string
    lesson_count: number
    price: number
  }
}

interface ExtendedUsage {
  id: string
  lesson_pack_purchase_id: string
  private_lesson_request_id?: string
  lessons_used: number
  used_at: string
  private_lesson_requests?: {
    id: string
    status: string
    requested_focus?: string
    created_at: string
  }
}

interface LessonPackHistoryProps {
  isOpen: boolean
  onClose: () => void
}

export function LessonPackHistory({ isOpen, onClose }: LessonPackHistoryProps) {
  const [loading, setLoading] = useState(true)
  const [purchases, setPurchases] = useState<ExtendedPurchase[]>([])
  const [usage, setUsage] = useState<ExtendedUsage[]>([])
  const [totalRemaining, setTotalRemaining] = useState(0)

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dancer/lesson-packs/history')
      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases || [])
        setUsage(data.usage || [])
        setTotalRemaining(data.totalRemaining || 0)
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  const getUsageForPurchase = (purchaseId: string) => {
    return usage.filter(u => u.lesson_pack_purchase_id === purchaseId)
  }

  const getTotalUsedForPurchase = (purchaseId: string) => {
    return getUsageForPurchase(purchaseId).reduce((sum, u) => sum + u.lessons_used, 0)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Lesson Pack History">
      <div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">Total Available Lessons</p>
              <p className="text-3xl font-bold text-blue-900">{totalRemaining}</p>
            </div>

            {/* Purchases */}
            {purchases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No lesson packs purchased yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Purchases</h3>
                {purchases.map((purchase) => {
                  const used = getTotalUsedForPurchase(purchase.id)
                  const purchased = purchase.lesson_pack?.lesson_count || 0
                  const remaining = purchase.remaining_lessons

                  return (
                    <Card key={purchase.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {purchase.lesson_pack?.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(purchase.purchased_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="primary">
                            ${purchase.lesson_pack?.price.toFixed(2)}
                          </Badge>
                        </div>

                        {/* Lesson breakdown */}
                        <div className="grid grid-cols-3 gap-3 text-center text-sm mb-3">
                          <div>
                            <p className="text-gray-600">Purchased</p>
                            <p className="text-lg font-bold text-gray-900">{purchased}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Used</p>
                            <p className="text-lg font-bold text-orange-600">{used}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Remaining</p>
                            <p className="text-lg font-bold text-green-600">{remaining}</p>
                          </div>
                        </div>

                        {/* Usage details */}
                        {getUsageForPurchase(purchase.id).length > 0 && (
                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-2">
                              Lessons Used:
                            </p>
                            <div className="space-y-1">
                              {getUsageForPurchase(purchase.id).map((use) => (
                                <div
                                  key={use.id}
                                  className="text-xs text-gray-600 flex justify-between"
                                >
                                  <span>
                                    {use.lessons_used} lesson{use.lessons_used > 1 ? 's' : ''}
                                  </span>
                                  <span>
                                    {new Date(use.used_at).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
