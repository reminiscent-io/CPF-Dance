'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const PromoPreview = dynamic(() => import('@/components/promo/dev/PromoPreview'), { ssr: false })

export default function PromoDevPage() {
  const router = useRouter()
  // Same guard as /dev: NODE_ENV is inlined at build time, so production
  // builds never render the harness.
  const allowed = process.env.NODE_ENV === 'development'

  useEffect(() => {
    if (!allowed) router.replace('/login')
  }, [allowed, router])

  if (!allowed) return null
  return <PromoPreview />
}
