'use client'

import dynamic from 'next/dynamic'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'

// The live preview draws with Konva, which needs the browser.
const BrandKitForm = dynamic(() => import('@/components/promo/admin/BrandKitForm'), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-96 rounded-lg" aria-busy="true" aria-label="Loading" />,
})

export default function PromoBrandPage() {
  const { profile } = useUser()
  return (
    <PortalLayout profile={profile}>
      <BrandKitForm />
    </PortalLayout>
  )
}
