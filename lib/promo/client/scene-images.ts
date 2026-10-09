'use client'

import type { Scene } from '../layout/scene'
import { photoNeeds } from './export'
import { loadAssetImage, pickRendition, type AssetFiles, type Rendition } from './images'

export interface ImagePlan {
  assetId: string
  rendition: Rendition
}

/**
 * Which rendition each photo needs to draw `scene` at `scale` output pixels
 * per design unit: the editor asks for screen size, an export for full size.
 */
export function planSceneImages(
  scene: Scene,
  assets: Record<string, AssetFiles | undefined>,
  scale: number
): ImagePlan[] {
  const plan: ImagePlan[] = []
  for (const { assetId, longEdge } of photoNeeds(scene, scale)) {
    const asset = assets[assetId]
    if (asset) plan.push({ assetId, rendition: pickRendition(asset, longEdge) })
  }
  return plan
}

/** Decoded images for a plan. Missing or unreadable photos draw as their slot's placeholder. */
export async function loadPlannedImages(
  plan: ImagePlan[],
  assets: Record<string, AssetFiles | undefined>
): Promise<Record<string, HTMLImageElement>> {
  const images: Record<string, HTMLImageElement> = {}
  await Promise.all(
    plan.map(async ({ assetId, rendition }) => {
      const asset = assets[assetId]
      if (!asset) return
      try {
        images[assetId] = await loadAssetImage(asset, rendition)
      } catch {
        // Deleted from storage or offline: leave the placeholder.
      }
    })
  )
  return images
}

/** A stable key for a plan, so effects reload images only when the plan changes. */
export function planKey(plan: ImagePlan[]): string {
  return plan
    .map((item) => `${item.assetId}:${item.rendition}`)
    .sort()
    .join('|')
}
