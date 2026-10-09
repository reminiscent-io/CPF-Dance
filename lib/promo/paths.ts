/** Storage layout in the private bucket, shared by the browser and the API. */

export const PROMO_BUCKET = 'promo-private'

export function assetPaths(ownerId: string, assetId: string) {
  const base = `${ownerId}/assets/${assetId}`
  return {
    original_path: `${base}/original.jpg`,
    display_path: `${base}/display.jpg`,
    thumb_path: `${base}/thumb.jpg`,
  }
}

export function designThumbPath(ownerId: string, designId: string) {
  return `${ownerId}/designs/${designId}/thumb.jpg`
}
