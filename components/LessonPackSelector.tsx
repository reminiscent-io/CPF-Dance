'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { StripePaymentDialog } from '@/components/StripePaymentDialog'
import type { LessonPack, LessonPackPurchase } from '@/lib/types'

interface LessonPackSelectorProps {
  onSelectPack: (packId: string, packName: string, lessons: number) => void
  selectedPackId?: string
  instructorId?: string | null
}

/**
 * Loads packs without touching component state, so both the mount effect and
 * the post-payment refresh can share it and own their own setState.
 */
async function loadLessonPacks(): Promise<{ packs: LessonPack[]; purchases: LessonPackPurchase[] }> {
  const response = await fetch('/api/dancer/lesson-packs')
  if (!response.ok) throw new Error('Could not load lesson packs.')
  const data = await response.json()
  return { packs: data.packs, purchases: data.purchases }
}

export function LessonPackSelector({ onSelectPack, selectedPackId, instructorId }: LessonPackSelectorProps) {
  const [packs, setPacks] = useState<LessonPack[]>([])
  const [purchases, setPurchases] = useState<LessonPackPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedPack, setSelectedPack] = useState<LessonPack | null>(null)

  useEffect(() => {
    let cancelled = false

    loadLessonPacks()
      .then(({ packs: loadedPacks, purchases: loadedPurchases }) => {
        if (cancelled) return
        setPacks(loadedPacks)
        setPurchases(loadedPurchases)
      })
      .catch((err) => {
        console.error('Error fetching packs:', err)
        if (!cancelled) setError('Could not load lesson packs.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price)

  const handlePurchase = (packId: string) => {
    if (!instructorId) {
      setError('We need to know your instructor before processing a purchase. Try refreshing.')
      return
    }
    const pack = packs.find((p) => p.id === packId)
    if (!pack) {
      setError('That pack is no longer available.')
      return
    }
    setError('')
    setSelectedPack(pack)
    setPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = async () => {
    setPaymentDialogOpen(false)
    setSelectedPack(null)
    try {
      const { packs: loadedPacks, purchases: loadedPurchases } = await loadLessonPacks()
      setPacks(loadedPacks)
      setPurchases(loadedPurchases)
    } catch (err) {
      console.error('Error fetching packs:', err)
      setError('Could not load lesson packs.')
    }
    if (selectedPack) {
      onSelectPack(
        selectedPack.id,
        selectedPack.name || `${selectedPack.lesson_count} Lessons`,
        selectedPack.lesson_count
      )
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" color="rose" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl text-charcoal-950 tracking-tight">
          Lesson packs
        </h2>
        <p className="mt-2 text-sm text-charcoal-500 leading-relaxed">
          Each lesson in a pack covers one private lesson with Courtney. Packs are valid for 12 months from purchase and used in the order you bought them.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="bg-champagne-100 rounded-lg px-4 py-3 text-sm text-charcoal-900"
          style={{ borderLeft: '1px solid var(--color-rose-600)' }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {packs.map((pack) => {
          const perLesson = pack.price / pack.lesson_count
          const isSelected = selectedPackId === pack.id
          const isBestRate =
            packs.length > 1 &&
            perLesson === Math.min(...packs.map((p) => p.price / p.lesson_count))
          return (
            <Card
              key={pack.id}
              className={isSelected ? 'ring-2 ring-rose-600 ring-offset-2 ring-offset-champagne-50' : ''}
              padding="md"
              hover
            >
              <CardContent>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.18em] text-charcoal-500">
                    {pack.lesson_count === 1 ? 'lesson' : 'lessons'}
                  </p>
                  <p className="mt-3 font-serif text-5xl text-charcoal-950 leading-none tracking-[-0.03em] tabular-nums">
                    {pack.lesson_count}
                  </p>
                  <p className="mt-5 font-serif text-2xl text-charcoal-950 tracking-tight tabular-nums">
                    {formatPrice(pack.price)}
                  </p>
                  <p
                    className={`mt-1 text-xs tabular-nums tracking-wide ${
                      isBestRate ? 'text-gold-700' : 'text-charcoal-500'
                    }`}
                  >
                    {formatPrice(perLesson)} each
                    {isBestRate && <span className="ml-1.5">· best rate</span>}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePurchase(pack.id)}
                    className="w-full mt-6"
                  >
                    Buy this pack
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {purchases.length > 0 && (
        <section aria-labelledby="active-packs-heading">
          <h3
            id="active-packs-heading"
            className="font-serif text-xl text-charcoal-950 tracking-tight mb-4"
          >
            Your active packs
          </h3>
          <ul className="divide-y divide-champagne-200 border-t border-champagne-200">
            {purchases.map((purchase) => (
              <li key={purchase.id} className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base text-charcoal-900">
                    {purchase.lesson_pack?.name ||
                      `${purchase.lesson_pack?.lesson_count ?? '?'}-pack`}
                  </p>
                  <p className="text-sm text-charcoal-500 tabular-nums">
                    Bought {new Date(purchase.purchased_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-charcoal-700 tabular-nums">
                  {purchase.remaining_lessons} of {purchase.lesson_pack?.lesson_count ?? '?'} left
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <StripePaymentDialog
        isOpen={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false)
          setSelectedPack(null)
        }}
        lessonPack={selectedPack}
        instructorId={instructorId || null}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
