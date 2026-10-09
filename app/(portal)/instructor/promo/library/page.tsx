'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowUpTrayIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { useUser } from '@/lib/auth/hooks'
import { PortalLayout } from '@/components/PortalLayout'
import { Button, EmptyState, Input, PageHeader, SegmentedControl, Toolbar } from '@/components/ui'
import { useAssetLibrary } from '@/components/promo/hooks'
import { ToggleChip } from '@/components/promo/ToggleChip'
import { AssetDetailSheet, formatBytes } from '@/components/promo/library/AssetDetailSheet'
import { filterAssets, PhotoGrid } from '@/components/promo/library/PhotoGrid'
import { UploadQueuePanel } from '@/components/promo/library/UploadQueuePanel'
import { SHOT_TYPE_LABELS } from '@/lib/promo/tags'
import { SHOT_TYPES, type ShotType } from '@/lib/promo/types'

// Supabase's Free plan includes 1 GB of storage across every bucket.
const STORAGE_PLAN_BYTES = 1024 ** 3

type View = 'all' | 'favorites'

function isPhotoFile(file: File) {
  return file.type.startsWith('image/') || /\.(hei[cf]|jpe?g|png|webp)$/i.test(file.name)
}

export default function PromoLibraryPage() {
  const { profile } = useUser()
  const { me, assets, bytesUsed, error, addFiles, updateAsset, deleteAsset } = useAssetLibrary()
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('all')
  const [shots, setShots] = useState<ShotType[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const shotCounts = useMemo(() => {
    const counts = new Map<ShotType, number>()
    for (const asset of assets ?? []) {
      for (const shot of asset.tags?.shotTypes ?? []) counts.set(shot, (counts.get(shot) ?? 0) + 1)
    }
    return counts
  }, [assets])

  const visible = useMemo(
    () => filterAssets(assets ?? [], { query, favoritesOnly: view === 'favorites', shots }),
    [assets, query, view, shots]
  )
  const openAsset = assets?.find((asset) => asset.id === openId) ?? null
  const storageShare = bytesUsed / STORAGE_PLAN_BYTES

  const pickFiles = () => inputRef.current?.click()
  const takeFiles = (list: FileList | null) => addFiles(Array.from(list ?? []).filter(isPhotoFile))
  const toggleShot = (shot: ShotType) =>
    setShots((current) => (current.includes(shot) ? current.filter((s) => s !== shot) : [...current, shot]))

  const subtitle =
    assets === null
      ? 'Private to you. Promos pull their photos from here.'
      : `Private to you · ${assets.length} ${assets.length === 1 ? 'photo' : 'photos'} · ${formatBytes(bytesUsed)} of 1 GB`

  const addButton = (
    <Button onClick={pickFiles} disabled={!me}>
      <ArrowUpTrayIcon className="mr-1.5 h-5 w-5" aria-hidden="true" />
      Add photos
    </Button>
  )

  return (
    <PortalLayout profile={profile}>
      <Link href="/instructor/promo" className="text-sm text-charcoal-500 hover:text-rose-700">
        ← Promo Studio
      </Link>
      <div className="mt-2">
        <PageHeader title="Photo library" subtitle={subtitle} action={addButton} />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          takeFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {storageShare >= 0.8 && (
        <p className="mt-4 rounded-lg bg-ballet-pink-100 px-4 py-3 text-sm text-ballet-pink-900">
          Storage is {Math.round(storageShare * 100)}% full. Delete photos you won’t use, or move the
          project to a paid Supabase plan before uploads start failing.
        </p>
      )}

      <Toolbar
        search={
          <Input
            placeholder="Search: kick, black leotard, studio…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search photos"
          />
        }
        filters={
          <SegmentedControl<View>
            aria-label="Show"
            options={[
              { value: 'all', label: 'All' },
              { value: 'favorites', label: 'Favorites' },
            ]}
            value={view}
            onChange={setView}
          />
        }
      />

      {shotCounts.size > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by shot">
          {SHOT_TYPES.filter((shot) => shotCounts.has(shot)).map((shot) => (
            <ToggleChip key={shot} selected={shots.includes(shot)} onClick={() => toggleShot(shot)}>
              {SHOT_TYPE_LABELS[shot]}
              <span className="tabular-nums text-xs opacity-70">{shotCounts.get(shot)}</span>
            </ToggleChip>
          ))}
        </div>
      )}

      <UploadQueuePanel className="mt-toolbar-gap" />

      <div
        className={`mt-toolbar-gap rounded-lg transition-[box-shadow] duration-200 ${
          dragging ? 'ring-2 ring-rose-500 ring-offset-4 ring-offset-champagne-50' : ''
        }`}
        onDragOver={(event) => {
          if (!me || !event.dataTransfer.types.includes('Files')) return
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
        }}
        onDrop={(event) => {
          if (!me) return
          event.preventDefault()
          setDragging(false)
          takeFiles(event.dataTransfer.files)
        }}
      >
        {error ? (
          <EmptyState icon={<PhotoIcon />} message={error} />
        ) : assets === null ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-busy="true" aria-label="Loading photos">
            {Array.from({ length: 12 }, (_, index) => (
              <div key={index} className="skeleton-shimmer aspect-[4/5] rounded-lg" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-champagne-300 bg-champagne-100">
            <EmptyState
              icon={<PhotoIcon />}
              message="Add your best shots. Promos pull from here, and nobody else can see them."
              action={addButton}
            />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState icon={<PhotoIcon />} message="No photos match this view." />
        ) : (
          <PhotoGrid assets={visible} onOpen={(asset) => setOpenId(asset.id)} />
        )}
      </div>

      <AssetDetailSheet
        asset={openAsset}
        onClose={() => setOpenId(null)}
        onUpdate={updateAsset}
        onDelete={deleteAsset}
      />
    </PortalLayout>
  )
}
