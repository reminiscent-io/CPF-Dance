'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'

// The canvas uses Konva, which needs the browser.
const TemplateEditor = dynamic(() => import('@/components/promo/admin/TemplateEditor'), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-96 rounded-lg" aria-busy="true" aria-label="Loading" />,
})

export default function PromoTemplateEditorPage() {
  const { profile } = useUser()
  const params = useParams()
  return (
    <PortalLayout profile={profile}>
      <TemplateEditor templateId={params?.id as string} />
    </PortalLayout>
  )
}
