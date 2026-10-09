'use client'

import { createClient } from '@/lib/supabase/client'

/**
 * Private photos never get a URL anyone else could open. The browser
 * downloads each file with her session (supabase-js sends the JWT in a
 * header) and turns it into a blob: URL that only exists inside this tab.
 * Blob URLs are same-origin, so Konva can export without tainting the canvas.
 */

export const PROMO_BUCKET = 'promo-private'

export type Rendition = 'thumb' | 'display' | 'original'

export const RENDITION_LONG_EDGE: Record<Exclude<Rendition, 'original'>, number> = {
  thumb: 400,
  display: 1600,
}

export interface AssetFiles {
  id: string
  width: number
  height: number
  original_path: string
  display_path: string
  thumb_path: string
}

const blobUrls = new Map<string, Promise<string>>()
const images = new Map<string, Promise<HTMLImageElement>>()

function pathFor(asset: AssetFiles, rendition: Rendition): string {
  if (rendition === 'thumb') return asset.thumb_path
  if (rendition === 'display') return asset.display_path
  return asset.original_path
}

/** Smallest rendition whose long edge covers `neededLongEdge` px (10% upscale allowed). */
export function pickRendition(asset: Pick<AssetFiles, 'width' | 'height'>, neededLongEdge: number): Rendition {
  const longEdge = Math.max(asset.width, asset.height)
  for (const rendition of ['thumb', 'display'] as const) {
    const edge = Math.min(RENDITION_LONG_EDGE[rendition], longEdge)
    if (edge * 1.1 >= neededLongEdge || edge === longEdge) return rendition
  }
  return 'original'
}

/** A blob: URL for one rendition, downloaded once per session. */
export function assetBlobUrl(asset: AssetFiles, rendition: Rendition): Promise<string> {
  const key = `${asset.id}:${rendition}`
  const cached = blobUrls.get(key)
  if (cached) return cached
  const promise = (async () => {
    const { data, error } = await createClient().storage.from(PROMO_BUCKET).download(pathFor(asset, rendition))
    if (error || !data) throw new Error(error?.message ?? 'Could not load the photo')
    return URL.createObjectURL(data)
  })()
  promise.catch(() => blobUrls.delete(key))
  blobUrls.set(key, promise)
  return promise
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode the photo'))
    image.src = url
  })
}

export function loadAssetImage(asset: AssetFiles, rendition: Rendition): Promise<HTMLImageElement> {
  const key = `${asset.id}:${rendition}`
  const cached = images.get(key)
  if (cached) return cached
  const promise = assetBlobUrl(asset, rendition).then(loadImage)
  promise.catch(() => images.delete(key))
  images.set(key, promise)
  return promise
}

/** Frees full-size originals after an export; the display renditions stay cached. */
export function releaseRendition(rendition: Rendition) {
  for (const [key, promise] of blobUrls) {
    if (!key.endsWith(`:${rendition}`)) continue
    promise.then((url) => URL.revokeObjectURL(url)).catch(() => undefined)
    blobUrls.delete(key)
    images.delete(key)
  }
}

/** Forget a deleted asset everywhere. */
export function forgetAsset(assetId: string) {
  for (const [key, promise] of blobUrls) {
    if (!key.startsWith(`${assetId}:`)) continue
    promise.then((url) => URL.revokeObjectURL(url)).catch(() => undefined)
    blobUrls.delete(key)
    images.delete(key)
  }
}
