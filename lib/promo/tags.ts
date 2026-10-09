import type { AssetPose, AssetTags, BackgroundType, ShotType } from './types'

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  full_body: 'Full body',
  three_quarter: 'Three-quarter',
  headshot: 'Headshot',
  kick: 'Kick',
  arms_up: 'Arms up',
  floor: 'Floor work',
  detail: 'Detail',
  group: 'Group',
}

export const BACKGROUND_LABELS: Record<BackgroundType, string> = {
  plain_light: 'Plain, light',
  plain_dark: 'Plain, dark',
  studio: 'Studio',
  stage: 'Stage',
  outdoor: 'Outdoor',
  busy: 'Busy',
}

export interface Landmark {
  x: number
  y: number
  visibility?: number
}

// BlazePose landmark indices (MediaPipe Pose Landmarker, 33 points).
const NOSE = 0
const SHOULDERS = [11, 12]
const WRISTS = [15, 16]
const HIPS = [23, 24]
const KNEES = [25, 26]
const ANKLES = [27, 28]
const FEET = [27, 28, 29, 30, 31, 32]

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

/**
 * Turns pose landmarks into crop anchors (subject box, head, feet) and
 * rule-based shot types. Pure, so the rules are testable without MediaPipe.
 */
export function poseFromLandmarks(landmarks: Landmark[]): AssetPose | null {
  if (landmarks.length < 33) return null
  const visible = (index: number) => {
    const point = landmarks[index]
    return (
      point !== undefined &&
      (point.visibility ?? 1) >= 0.5 &&
      point.x >= -0.02 &&
      point.x <= 1.02 &&
      point.y >= -0.02 &&
      point.y <= 1.02
    )
  }
  const points = landmarks.filter((_, index) => visible(index))
  if (points.length < 5) return null

  const xs = points.map((p) => clamp01(p.x))
  const ys = points.map((p) => clamp01(p.y))
  const noseVisible = visible(NOSE)
  // Hair sits above the highest landmark; leave headroom.
  const top = clamp01(Math.min(...ys) - (noseVisible ? 0.1 : 0.04))
  const bottom = clamp01(Math.max(...ys) + 0.04)
  const left = clamp01(Math.min(...xs) - 0.06)
  const right = clamp01(Math.max(...xs) + 0.06)
  const subject = { x: left, y: top, w: right - left, h: bottom - top }

  const anyVisible = (indices: number[]) => indices.some(visible)
  const allVisible = (indices: number[]) => indices.every(visible)
  const shots = new Set<ShotType>()

  const head = noseVisible ? { x: clamp01(landmarks[NOSE].x), y: clamp01(landmarks[NOSE].y) } : undefined
  const footPoints = FEET.filter(visible).map((index) => landmarks[index])
  const lowestFoot = footPoints.sort((a, b) => b.y - a.y)[0]
  const feet = lowestFoot ? { x: clamp01(lowestFoot.x), y: clamp01(lowestFoot.y) } : undefined

  const hipY = anyVisible(HIPS)
    ? Math.min(...HIPS.filter(visible).map((index) => landmarks[index].y))
    : undefined

  if (noseVisible && anyVisible(ANKLES) && subject.h >= 0.55) shots.add('full_body')
  else if (noseVisible && anyVisible(KNEES) && !anyVisible(ANKLES)) shots.add('three_quarter')
  if (noseVisible && anyVisible(SHOULDERS) && !anyVisible(HIPS)) shots.add('headshot')
  if (noseVisible && allVisible(WRISTS) && WRISTS.every((index) => landmarks[index].y < landmarks[NOSE].y)) {
    shots.add('arms_up')
  }
  if (hipY !== undefined && ANKLES.some((index) => visible(index) && landmarks[index].y < hipY - 0.02)) {
    shots.add('kick')
  }
  if (!noseVisible && (anyVisible(ANKLES) || anyVisible(KNEES))) shots.add('detail')

  return { subject, head, feet, source: 'pose', shots: [...shots] }
}

/** Adds pose-derived shot types to whatever tags exist. */
export function mergePoseTags(tags: AssetTags, pose: AssetPose | null | undefined): AssetTags {
  const shots = new Set<ShotType>([...(tags.shotTypes ?? []), ...(pose?.shots ?? [])])
  return { ...tags, shotTypes: [...shots] }
}

/** How well a photo suits a slot's preferred shots: 2 per match, 1 for orientation fit. */
export function slotFitScore(
  tags: AssetTags | null | undefined,
  preferred: ShotType[] | undefined,
  slotIsPortrait: boolean
): number {
  let score = 0
  for (const shot of preferred ?? []) {
    if (tags?.shotTypes?.includes(shot)) score += 2
  }
  if (tags?.orientation === (slotIsPortrait ? 'portrait' : 'landscape')) score += 1
  return score
}
