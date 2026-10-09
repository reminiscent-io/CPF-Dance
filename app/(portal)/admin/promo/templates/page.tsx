'use client'

import Link from 'next/link'
import { Squares2X2Icon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/auth/hooks'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { PortalLayout } from '@/components/PortalLayout'
import { Badge, EmptyState, PageHeader } from '@/components/ui'
import { promoFetch } from '@/components/promo/hooks'

interface TemplateSummary {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
  currentVersion: number | null
  draftUpdatedAt: string | null
  versions: number
}

export default function PromoTemplatesPage() {
  const { profile } = useUser()
  const { data, error, loading } = useAsyncData<{ templates: TemplateSummary[] }>(
    (signal) => promoFetch('/api/admin/promo/templates', { signal }),
    []
  )

  return (
    <PortalLayout profile={profile}>
      <PageHeader title="Promo templates" subtitle="Layouts Promo Studio fills. Edit a draft, then publish it as a new version." />
      <div className="mt-header-gap">
        {error ? (
          <EmptyState icon={<Squares2X2Icon />} message={error} />
        ) : loading && !data ? (
          <div className="skeleton-shimmer h-24 rounded-lg" aria-busy="true" />
        ) : (data?.templates.length ?? 0) === 0 ? (
          <EmptyState icon={<Squares2X2Icon />} message="No templates yet. Open Promo Studio once to add the built-in one." />
        ) : (
          <ul className="space-y-3">
            {data!.templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={`/admin/promo/templates/${template.id}`}
                  className="block rounded-lg border border-champagne-200 bg-champagne-50 p-5 transition-colors hover:bg-champagne-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-serif text-xl font-semibold text-charcoal-950">{template.name}</h2>
                    {template.draftUpdatedAt && <Badge size="sm">Draft waiting</Badge>}
                    {template.status === 'archived' && <Badge size="sm">Archived</Badge>}
                  </div>
                  {template.description && <p className="mt-1 text-sm text-charcoal-600">{template.description}</p>}
                  <p className="mt-2 text-xs text-charcoal-500">
                    Live version {template.currentVersion ?? '–'} · {template.versions} published
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PortalLayout>
  )
}
