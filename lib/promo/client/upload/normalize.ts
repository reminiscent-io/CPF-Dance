'use client'

/**
 * Prepares a photo on her device before anything is uploaded.
 *
 * The photo is decoded by the browser (Safari reads HEIC natively; iPhone
 * photo-library picks usually arrive as JPEG already), drawn onto a canvas
 * with its orientation applied, and re-encoded as JPEG. A canvas carries no
 * metadata, so EXIF, GPS and XMP never leave the phone. The original is
 * capped at 16 MP: enough to print the poster's hero at about 280 dpi, and
 * under iOS 17's 4096² canvas limit.
 */

export const MAX_ORIGINAL_PIXELS = 16_000_000
export const DISPLAY_LONG_EDGE = 1600
export const THUMB_LONG_EDGE = 400
const POSE_LONG_EDGE = 512
const PAPER = '#faf8f5'

export class UnsupportedPhotoError extends Error {}

export interface NormalizedPhoto {
  original: Blob
  display: Blob
  thumb: Blob
  width: number
  height: number
  sha256: string
  /** Small canvas for pose detection; free it with releaseCanvas when done. */
  poseCanvas: HTMLCanvasElement
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function fitLongEdge(width: number, height: number, longEdge: number): [number, number] {
  const scale = Math.min(1, longEdge / Math.max(width, height))
  return [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))]
}

export function capPixels(width: number, height: number, maxPixels: number): [number, number] {
  const scale = Math.min(1, Math.sqrt(maxPixels / (width * height)))
  return [Math.max(1, Math.floor(width * scale)), Math.max(1, Math.floor(height * scale))]
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('decode failed'))
    image.src = url
  })
}

function drawScaled(image: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable')
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, width, height)
  return canvas
}

export function releaseCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0
  canvas.height = 0
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        releaseCanvas(canvas)
        if (blob) resolve(blob)
        else reject(new Error('Could not encode the photo'))
      },
      'image/jpeg',
      quality
    )
  })
}

export async function normalizePhoto(file: File, maxPixels = MAX_ORIGINAL_PIXELS): Promise<NormalizedPhoto> {
  const sha256 = await sha256Hex(file)
  const url = URL.createObjectURL(file)
  try {
    let image: HTMLImageElement
    try {
      image = await loadImage(url)
    } catch {
      throw new UnsupportedPhotoError(
        file.type === 'image/heic' || /\.hei[cf]$/i.test(file.name)
          ? 'This browser can’t read HEIC photos. Upload from Safari or your iPhone, or export it as JPEG.'
          : 'This file isn’t a photo we can read. Use a JPEG, PNG or HEIC from your camera roll.'
      )
    }
    // naturalWidth/Height already have the EXIF orientation applied.
    const [width, height] = capPixels(image.naturalWidth, image.naturalHeight, maxPixels)
    const original = await toJpeg(drawScaled(image, width, height), 0.9)
    const display = await toJpeg(drawScaled(image, ...fitLongEdge(width, height, DISPLAY_LONG_EDGE)), 0.85)
    const thumb = await toJpeg(drawScaled(image, ...fitLongEdge(width, height, THUMB_LONG_EDGE)), 0.8)
    const poseCanvas = drawScaled(image, ...fitLongEdge(width, height, POSE_LONG_EDGE))
    image.src = ''
    return { original, display, thumb, width, height, sha256, poseCanvas }
  } finally {
    URL.revokeObjectURL(url)
  }
}
