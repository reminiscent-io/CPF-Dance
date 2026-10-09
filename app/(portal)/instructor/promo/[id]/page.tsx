'use client'

import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { EditorSkeleton } from '@/components/promo/editor/EditorSkeleton'

// Konva needs the browser; the editor loads on the client only.
const PromoEditor = dynamic(() => import('@/components/promo/editor/PromoEditor'), {
  ssr: false,
  loading: () => <EditorSkeleton />,
})

export default function PromoEditorPage() {
  const { profile } = useUser()
  const params = useParams()
  const id = params?.id as string

  return (
    <PortalLayout profile={profile}>
      <PromoEditor designId={id} />
    </PortalLayout>
  )
}
