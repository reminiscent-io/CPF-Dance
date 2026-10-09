'use client'

import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import type { PromoAsset, ShotType } from '@/lib/promo/types'
import { AssetThumb } from './AssetThumb'

export interface PhotoFilter {
  query: string
  favoritesOnly: boolean
  shots: ShotType[]
}

/** Matches every chosen shot type, and the query against description, mood and filename. */
export function filterAssets(assets: PromoAsset[], filter: PhotoFilter): PromoAsset[] {
  const words = filter.query.toLowerCase().split(/\s+/).filter(Boolean)
  return assets.filter((asset) => {
    if (filter.favoritesOnly && !asset.favorite) return false
    if (filter.shots.some((shot) => !asset.tags?.shotTypes?.includes(shot))) return false
    if (words.length === 0) return true
    const haystack = [asset.tags?.description, asset.tags?.mood, asset.original_filename, ...(asset.tags?.shotTypes ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/_/g, ' ')
    return words.every((word) => haystack.includes(word))
  })
}

export interface PhotoGridProps {
  assets: PromoAsset[]
  /** Library mode: tap opens the photo. */
  onOpen?: (asset: PromoAsset) => void
  /** Picker mode: tap toggles; the badge shows pick order. */
  selectedIds?: string[]
  onToggle?: (asset: PromoAsset) => void
  className?: string
}

export function PhotoGrid({ assets, onOpen, selectedIds, onToggle, className = '' }: PhotoGridProps) {
  const picking = Boolean(onToggle)
  return (
    <ul className={`grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 ${className}`}>
      {assets.map((asset) => {
        const order = selectedIds ? selectedIds.indexOf(asset.id) : -1
        const selected = order !== -1
        const label = asset.tags?.description || asset.original_filename || 'Photo'
        return (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => (picking ? onToggle?.(asset) : onOpen?.(asset))}
              aria-pressed={picking ? selected : undefined}
              aria-label={picking ? `${selected ? 'Remove' : 'Use'} photo: ${label}` : `Open photo: ${label}`}
              className={`group relative block w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2
                ${selected ? 'ring-2 ring-rose-600 ring-offset-2 ring-offset-champagne-50' : ''}`}
            >
              <AssetThumb
                asset={asset}
                className="aspect-[4/5] w-full transition-opacity duration-200 group-hover:opacity-90"
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 200px"
              />
              {asset.favorite && !picking && (
                <HeartSolidIcon
                  className="absolute right-2 top-2 h-4 w-4 text-champagne-50 drop-shadow"
                  aria-label="Favorite"
                />
              )}
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs font-semibold text-champagne-50 tabular-nums">
                  {order + 1}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
