import type { AssetPose, AssetTags } from '../types'

export interface Size {
  width: number
  height: number
}

export interface DrawRect {
  x: number
  y: number
  width: number
  height: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/**
 * Where to draw an image inside a slot so it covers the slot, scaled by
 * `zoom`, with the normalized focus point as close to the slot centre as the
 * image edges allow. Coordinates are slot-local. Works for any rendition of
 * the asset because the focus point is normalized.
 */
export function coverRect(
  image: Size,
  slot: Size,
  placement: { focusX: number; focusY: number; zoom: number }
): DrawRect {
  if (image.width <= 0 || image.height <= 0 || slot.width <= 0 || slot.height <= 0) {
    return { x: 0, y: 0, width: slot.width, height: slot.height }
  }
  const scale = Math.max(slot.width / image.width, slot.height / image.height) * Math.max(1, placement.zoom)
  const width = image.width * scale
  const height = image.height * scale
  const x = clamp(slot.width / 2 - placement.focusX * width, slot.width - width, 0)
  const y = clamp(slot.height / 2 - placement.focusY * height, slot.height - height, 0)
  return { x, y, width, height }
}

/** Inverse of coverRect for panning: the focus point that puts the image at (x, y). */
export function focusForOffset(
  image: Size,
  slot: Size,
  zoom: number,
  x: number,
  y: number
): { focusX: number; focusY: number } {
  const rect = coverRect(image, slot, { focusX: 0.5, focusY: 0.5, zoom })
  const cx = clamp(x, slot.width - rect.width, 0)
  const cy = clamp(y, slot.height - rect.height, 0)
  return {
    focusX: clamp((slot.width / 2 - cx) / rect.width, 0, 1),
    focusY: clamp((slot.height / 2 - cy) / rect.height, 0, 1),
  }
}

/**
 * Default focus for a photo: the subject's centre, nudged up so a tall slot
 * keeps her head in frame; her face for headshots; a little above centre
 * when nothing is known.
 */
export function defaultFocus(
  pose: AssetPose | null | undefined,
  tags?: AssetTags | null
): { focusX: number; focusY: number } {
  const isHeadshot = tags?.shotTypes?.includes('headshot') ?? false
  if (isHeadshot && pose?.head) {
    return { focusX: clamp(pose.head.x, 0, 1), focusY: clamp(pose.head.y + 0.08, 0, 1) }
  }
  if (pose?.subject) {
    const { x, y, w, h } = pose.subject
    return { focusX: clamp(x + w / 2, 0, 1), focusY: clamp(y + h * 0.45, 0, 1) }
  }
  return { focusX: 0.5, focusY: 0.42 }
}
