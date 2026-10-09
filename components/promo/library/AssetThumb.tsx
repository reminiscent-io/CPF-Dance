'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { defaultFocus } from '@/lib/promo/layout/crop'
import type { Rendition } from '@/lib/promo/client/images'
import type { PromoAsset } from '@/lib/promo/types'
import { useAssetUrl } from '../hooks'

export interface AssetThumbProps {
  asset: PromoAsset
  rendition?: Rendition
  /** Hint for the browser; blob: images skip the optimizer either way. */
  sizes?: string
  className?: string
}

/**
 * A private photo, downloaded only when it scrolls near the viewport and
 * cropped around her (pose anchors) instead of the frame's center.
 */
export function AssetThumb({ asset, rendition = 'thumb', sizes = '200px', className = '' }: AssetThumbProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node || near) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true)
          observer.disconnect()
        }
      },
      { rootMargin: '600px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [near])

  const url = useAssetUrl(asset, rendition, near)
  const focus = defaultFocus(asset.pose, asset.tags)

  return (
    <div ref={ref} className={`relative overflow-hidden bg-champagne-100 ${className}`}>
      {url && (
        <Image
          src={url}
          alt={asset.tags?.description || asset.original_filename || 'Photo'}
          fill
          sizes={sizes}
          draggable={false}
          className="object-cover animate-fadeIn"
          style={{ objectPosition: `${Math.round(focus.focusX * 100)}% ${Math.round(focus.focusY * 100)}%` }}
        />
      )}
    </div>
  )
}
