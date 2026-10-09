'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SaveStatus } from '@/lib/promo/client/autosave'
import { exportImage } from '@/lib/promo/client/export'
import type { ImagePlan } from '@/lib/promo/client/scene-images'
import type { Scene } from '@/lib/promo/layout/scene'
import { designThumbPath, PROMO_BUCKET } from '@/lib/promo/paths'

const THUMB_WIDTH = 360
const MIN_GAP_MS = 20_000

/**
 * Keeps the history page's thumbnail current: after a save settles (at most
 * every 20 seconds), renders a 360 px JPEG of the design and uploads it to
 * her private folder. Waits for the photos so the thumbnail isn't blank.
 */
export function useDesignThumbnail(options: {
  designId: string
  ownerId: string
  hasThumbnail: boolean
  status: SaveStatus
  version: number
  scene: Scene | null
  images: Record<string, HTMLImageElement>
  plan: ImagePlan[]
}) {
  const { designId, ownerId, status, version, scene, images, plan } = options
  const [last, setLast] = useState(() => ({ version: options.hasThumbnail ? 0 : -1, at: 0 }))

  const photosReady = plan.every((item) => images[item.assetId])

  useEffect(() => {
    if (status !== 'saved' || !scene || !photosReady || version === last.version) return
    const wait = Math.max(0, last.at + MIN_GAP_MS - Date.now())
    const timer = setTimeout(async () => {
      setLast({ version, at: Date.now() })
      try {
        const blob = await exportImage(scene, images, {
          type: 'image/jpeg',
          scale: THUMB_WIDTH / scene.width,
          quality: 0.8,
        })
        const { error } = await createClient()
          .storage.from(PROMO_BUCKET)
          .upload(designThumbPath(ownerId, designId), blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '60' })
        if (!error) await fetch(`/api/promo/designs/${designId}/thumbnail`, { method: 'POST' })
      } catch {
        // A missing thumbnail only affects the history grid.
      }
    }, wait)
    return () => clearTimeout(timer)
  }, [status, scene, images, photosReady, version, last, designId, ownerId])
}
