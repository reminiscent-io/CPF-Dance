'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const AdminHarness = dynamic(() => import('@/components/promo/dev/AdminHarness'), { ssr: false })

export default function PromoAdminDevPage() {
  const router = useRouter()
  // Same guard as /dev/promo: production builds never render the harness.
  const allowed = process.env.NODE_ENV === 'development'

  useEffect(() => {
    if (!allowed) router.replace('/login')
  }, [allowed, router])

  if (!allowed) return null
  return <AdminHarness />
}
