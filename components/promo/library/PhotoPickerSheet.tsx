'use client'

import { useMemo, useRef, useState } from 'react'
import { ArrowUpTrayIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { Button, EmptyState, Input, Sheet, SheetBody } from '@/components/ui'
import type { PromoAsset } from '@/lib/promo/types'
import { useAssetLibrary } from '../hooks'
import { ToggleChip } from '../ToggleChip'
import { filterAssets, PhotoGrid } from './PhotoGrid'
import { UploadQueuePanel } from './UploadQueuePanel'

export interface PhotoPickerSheetProps {
  isOpen: boolean
  title: string
  onClose: () => void
  onPick: (asset: PromoAsset) => void
}

/** Choose one library photo, or upload new ones and pick from those. */
export function PhotoPickerSheet({ isOpen, title, onClose, onPick }: PhotoPickerSheetProps) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {isOpen && <PickerBody onPick={onPick} />}
    </Sheet>
  )
}

function PickerBody({ onPick }: { onPick: (asset: PromoAsset) => void }) {
  const { me, assets, error, addFiles } = useAssetLibrary()
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const visible = useMemo(
    () => filterAssets(assets ?? [], { query, favoritesOnly, shots: [] }),
    [assets, query, favoritesOnly]
  )

  return (
    <SheetBody>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            placeholder="Search photos"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search photos"
          />
        </div>
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={!me}>
          <ArrowUpTrayIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
      </div>
      <div className="mt-3">
        <ToggleChip selected={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>
          Favorites
        </ToggleChip>
      </div>
      <UploadQueuePanel className="mt-3" />
      <div className="mt-4">
        {error ? (
          <EmptyState icon={<PhotoIcon />} message={error} />
        ) : assets === null ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="skeleton-shimmer aspect-[4/5] rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<PhotoIcon />}
            message={assets.length === 0 ? 'Your library is empty. Upload a few photos.' : 'No photos match.'}
          />
        ) : (
          <PhotoGrid assets={visible} onOpen={onPick} className="sm:grid-cols-4 lg:grid-cols-4" />
        )}
      </div>
    </SheetBody>
  )
}
