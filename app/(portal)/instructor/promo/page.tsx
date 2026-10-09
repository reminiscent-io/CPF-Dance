'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EllipsisHorizontalIcon, MegaphoneIcon, PhotoIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/auth/hooks'
import { useAsyncData } from '@/lib/hooks/useAsyncData'
import { PortalLayout } from '@/components/PortalLayout'
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  SegmentedControl,
  Toolbar,
  useToast,
} from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { DesignThumb } from '@/components/promo/DesignThumb'
import { promoFetch } from '@/components/promo/hooks'
import { FORMAT_SPECS } from '@/lib/promo/formats'
import type { PromoFormat } from '@/lib/promo/types'

interface DesignSummary {
  id: string
  owner_id: string
  title: string
  format: PromoFormat
  group_id: string
  class_ids: string[]
  revision: number
  thumbnail_updated_at: string | null
  updated_at: string
}

interface DesignList {
  designs: DesignSummary[]
  publications: { design_id: string; public_url: string; class_id: string | null }[]
  classes: { id: string; title: string; start_time: string }[]
}

type FormatFilter = 'all' | PromoFormat

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export default function PromoHistoryPage() {
  const { profile } = useUser()
  const router = useRouter()
  const { addToast } = useToast()
  const { data, error, loading, refetch } = useAsyncData<DesignList>(
    (signal) => promoFetch<DesignList>('/api/promo/designs', { signal }),
    []
  )
  const [query, setQuery] = useState('')
  const [format, setFormat] = useState<FormatFilter>('all')
  const [deleting, setDeleting] = useState<DesignSummary | null>(null)
  const [busy, setBusy] = useState(false)

  const live = useMemo(() => new Set(data?.publications.map((item) => item.design_id)), [data])
  const classTitles = useMemo(() => new Map(data?.classes.map((cls) => [cls.id, cls.title])), [data])
  const designs = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return (data?.designs ?? []).filter((design) => {
      if (format !== 'all' && design.format !== format) return false
      const haystack = [design.title, ...design.class_ids.map((id) => classTitles.get(id) ?? '')].join(' ').toLowerCase()
      return words.every((word) => haystack.includes(word))
    })
  }, [data, query, format, classTitles])

  const duplicate = async (design: DesignSummary) => {
    try {
      const { design: copy } = await promoFetch<{ design: { id: string } }>(`/api/promo/designs/${design.id}/duplicate`, {
        method: 'POST',
      })
      router.push(`/instructor/promo/${copy.id}`)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'That didn’t work. Try again.', 'error')
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await promoFetch(`/api/promo/designs/${deleting.id}`, { method: 'DELETE' })
      addToast('Promo deleted', 'success')
      setDeleting(null)
      refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'That didn’t work. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const newPromo = (
    <Button onClick={() => router.push('/instructor/promo/new')}>
      <PlusIcon className="mr-1.5 h-5 w-5" aria-hidden="true" />
      New promo
    </Button>
  )

  return (
    <PortalLayout profile={profile}>
      <PageHeader title="Promo Studio" subtitle="Class promos for Instagram and print, from your own photos." action={newPromo} />

      <Toolbar
        search={
          <Input
            placeholder="Search by title or class"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search promos"
          />
        }
        filters={
          <>
            <SegmentedControl<FormatFilter>
              aria-label="Format"
              options={[
                { value: 'all', label: 'All' },
                { value: 'ig_post', label: 'Post' },
                { value: 'ig_story', label: 'Story' },
                { value: 'poster', label: 'Poster' },
              ]}
              value={format}
              onChange={setFormat}
            />
            <Link
              href="/instructor/promo/library"
              className="inline-flex min-h-control items-center gap-1.5 rounded-lg border border-champagne-300 px-4 text-sm font-medium text-charcoal-700 transition-colors hover:bg-champagne-100"
            >
              <PhotoIcon className="h-4 w-4" aria-hidden="true" />
              Photos
            </Link>
          </>
        }
      />

      <div className="mt-toolbar-gap">
        {error ? (
          <EmptyState icon={<MegaphoneIcon />} message={error} action={<Button variant="outline" onClick={refetch}>Try again</Button>} />
        ) : loading && !data ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading promos">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="skeleton-shimmer aspect-[4/5] rounded-lg" />
            ))}
          </div>
        ) : designs.length === 0 ? (
          <div className="rounded-lg border border-champagne-200 bg-champagne-100">
            <EmptyState
              icon={<MegaphoneIcon />}
              message={
                (data?.designs.length ?? 0) === 0
                  ? 'No promos yet. Start one from a class and a few of your photos.'
                  : 'No promos match this view.'
              }
              action={(data?.designs.length ?? 0) === 0 ? newPromo : undefined}
            />
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {designs.map((design) => {
              const classTitle = design.class_ids.map((id) => classTitles.get(id)).find(Boolean)
              return (
                <li key={design.id} className="overflow-hidden rounded-lg border border-champagne-200 bg-champagne-50">
                  <Link
                    href={`/instructor/promo/${design.id}`}
                    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500"
                    aria-label={`Open ${design.title}, ${FORMAT_SPECS[design.format].shortLabel.toLowerCase()}`}
                  >
                    <DesignThumb design={design} className="aspect-[4/5] w-full" />
                  </Link>
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-serif text-lg font-semibold text-charcoal-950">{design.title}</h2>
                      <p className="mt-0.5 truncate text-xs text-charcoal-500">
                        {FORMAT_SPECS[design.format].shortLabel} · {dateFormat.format(new Date(design.updated_at))}
                        {classTitle ? ` · ${classTitle}` : ''}
                      </p>
                      {live.has(design.id) && (
                        <Badge variant="success" size="sm" className="mt-1.5">
                          On the site
                        </Badge>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Actions for ${design.title}`}
                          className="inline-flex h-control w-control flex-shrink-0 items-center justify-center rounded-md text-charcoal-500 transition-colors hover:bg-champagne-100 hover:text-charcoal-900"
                        >
                          <EllipsisHorizontalIcon className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => duplicate(design)}>Duplicate</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={() => setDeleting(design)}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Delete this promo?"
        body={
          deleting && live.has(deleting.id)
            ? 'It’s on the site now. Deleting takes the public copy down too. Your photos stay in the library.'
            : 'Your photos stay in the library. Other formats of this promo stay too.'
        }
        confirmLabel={busy ? 'Deleting…' : 'Delete promo'}
        tone="destructive"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </PortalLayout>
  )
}
