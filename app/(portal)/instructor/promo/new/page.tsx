'use client'

import dynamic from 'next/dynamic'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'

// The variation cards draw with Konva, which needs the browser.
const NewPromo = dynamic(() => import('@/components/promo/brief/NewPromo'), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-96 rounded-lg" aria-busy="true" aria-label="Loading" />,
})

export default function NewPromoPage() {
  const { profile } = useUser()
  return (
    <PortalLayout profile={profile}>
      <NewPromo />
    </PortalLayout>
  )
}
