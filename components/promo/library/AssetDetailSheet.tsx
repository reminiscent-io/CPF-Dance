'use client'

import { useState } from 'react'
import Image from 'next/image'
import { HeartIcon, TrashIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import { Button, ConfirmDialog, Select, Sheet, SheetBody, SheetFooter, useToast } from '@/components/ui'
import { BACKGROUND_LABELS, SHOT_TYPE_LABELS } from '@/lib/promo/tags'
import { BACKGROUND_TYPES, SHOT_TYPES, type BackgroundType, type PromoAsset, type ShotType } from '@/lib/promo/types'
import { useAssetUrl } from '../hooks'
import { ToggleChip } from '../ToggleChip'

export interface AssetDetailSheetProps {
  asset: PromoAsset | null
  onClose: () => void
  onUpdate: (
    id: string,
    changes: { favorite?: boolean; tags?: { shotTypes?: ShotType[]; background?: BackgroundType } }
  ) => Promise<unknown>
  onDelete: (asset: PromoAsset) => Promise<unknown>
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

/** One photo: preview, tags she can correct, favorite, delete. */
export function AssetDetailSheet({ asset, onClose, onUpdate, onDelete }: AssetDetailSheetProps) {
  return (
    <Sheet isOpen={asset !== null} onClose={onClose} title="Photo" size="lg">
      {asset && (
        <AssetDetail key={asset.id} asset={asset} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />
      )}
    </Sheet>
  )
}

function AssetDetail({ asset, onClose, onUpdate, onDelete }: AssetDetailSheetProps & { asset: PromoAsset }) {
  const { addToast } = useToast()
  const url = useAssetUrl(asset, 'display')
  const [shotTypes, setShotTypes] = useState<ShotType[]>(asset.tags?.shotTypes ?? [])
  const [background, setBackground] = useState<BackgroundType | ''>(asset.tags?.background ?? '')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const dirty =
    background !== (asset.tags?.background ?? '') ||
    shotTypes.length !== (asset.tags?.shotTypes ?? []).length ||
    shotTypes.some((shot) => !asset.tags?.shotTypes?.includes(shot))

  const toggleShot = (shot: ShotType) =>
    setShotTypes((current) => (current.includes(shot) ? current.filter((s) => s !== shot) : [...current, shot]))

  const toggleFavorite = async () => {
    try {
      await onUpdate(asset.id, { favorite: !asset.favorite })
    } catch (error) {
      addToast((error as Error).message, 'error')
    }
  }

  const saveTags = async () => {
    setSaving(true)
    try {
      await onUpdate(asset.id, { tags: { shotTypes, ...(background ? { background } : {}) } })
      addToast('Tags saved', 'success')
    } catch (error) {
      addToast((error as Error).message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await onDelete(asset)
      setConfirmDelete(false)
      onClose()
      addToast('Photo deleted', 'success')
    } catch (error) {
      addToast((error as Error).message, 'error')
      setDeleting(false)
    }
  }

  const megapixels = (asset.width * asset.height) / 1_000_000

  return (
    <>
      <SheetBody>
        <div
          className="relative mx-auto w-full overflow-hidden rounded-lg bg-champagne-100"
          style={{ aspectRatio: `${asset.width} / ${asset.height}`, maxHeight: '50vh', maxWidth: `calc(50vh * ${asset.width / asset.height})` }}
        >
          {url && (
            <Image
              src={url}
              alt={asset.tags?.description || 'Photo'}
              fill
              sizes="(max-width: 640px) 100vw, 576px"
              className="object-contain"
            />
          )}
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {asset.tags?.description ? (
              <p className="text-sm text-charcoal-800">{asset.tags.description}</p>
            ) : (
              <p className="text-sm text-charcoal-500">
                {asset.tagged_at ? 'No description.' : 'Tags arrive a few seconds after upload.'}
              </p>
            )}
            {asset.tags?.mood && <p className="mt-1 text-xs text-charcoal-500">Mood: {asset.tags.mood}</p>}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleFavorite}
            aria-pressed={asset.favorite}
            className="flex-shrink-0"
          >
            {asset.favorite ? (
              <HeartSolidIcon className="mr-1.5 h-4 w-4 text-rose-600" aria-hidden="true" />
            ) : (
              <HeartIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {asset.favorite ? 'Favorite' : 'Add to favorites'}
          </Button>
        </div>

        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-charcoal-500">Shot</legend>
          <div className="flex flex-wrap gap-2">
            {SHOT_TYPES.map((shot) => (
              <ToggleChip key={shot} selected={shotTypes.includes(shot)} onClick={() => toggleShot(shot)}>
                {SHOT_TYPE_LABELS[shot]}
              </ToggleChip>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 sm:max-w-xs">
          <Select
            label="Background"
            id="promo-asset-background"
            value={background}
            onChange={(event) => setBackground(event.target.value as BackgroundType | '')}
            options={[
              // Tags merge on save, so a set background can be changed but not cleared.
              ...(asset.tags?.background ? [] : [{ value: '', label: 'Not set' }]),
              ...BACKGROUND_TYPES.map((type) => ({ value: type, label: BACKGROUND_LABELS[type] })),
            ]}
          />
        </div>

        <p className="mt-3 text-xs text-charcoal-500">
          {asset.tags_edited
            ? 'You set these tags. Automatic tagging leaves them alone.'
            : 'Tags were suggested automatically. Fix anything wrong and your edits stick.'}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-champagne-200 pt-4 text-sm">
          <dt className="text-charcoal-500">Size</dt>
          <dd className="text-charcoal-800 tabular-nums">
            {asset.width} × {asset.height} ({megapixels.toFixed(1)} MP)
          </dd>
          <dt className="text-charcoal-500">Storage</dt>
          <dd className="text-charcoal-800 tabular-nums">{formatBytes(asset.bytes)}</dd>
          <dt className="text-charcoal-500">Added</dt>
          <dd className="text-charcoal-800">{dateFormat.format(new Date(asset.created_at))}</dd>
          {asset.original_filename && (
            <>
              <dt className="text-charcoal-500">File</dt>
              <dd className="truncate text-charcoal-800">{asset.original_filename}</dd>
            </>
          )}
        </dl>
        {megapixels < 6 && (
          <p className="mt-3 text-xs text-charcoal-500">
            Under 6 MP: fine for Instagram, soft on an 11×17 print.
          </p>
        )}
      </SheetBody>
      <SheetFooter className="justify-between">
        <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
          <TrashIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Delete
        </Button>
        <Button onClick={saveTags} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save tags'}
        </Button>
      </SheetFooter>
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete this photo?"
        body="It leaves your library and storage for good. Promos that used it keep an empty frame until you pick another photo."
        confirmLabel={deleting ? 'Deleting…' : 'Delete photo'}
        tone="destructive"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}
