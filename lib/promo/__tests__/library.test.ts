import { describe, expect, it } from 'vitest'
import { applyTagResult } from '../ai/tag'
import { costMicros, formatMicros, priceFor } from '../ai/pricing'
import { tusEndpoint } from '../client/upload/queue'
import { capPixels, fitLongEdge } from '../client/upload/normalize'
import { mergePoseTags, poseFromLandmarks, slotFitScore, type Landmark } from '../tags'

// BlazePose: 0 nose, 1–10 face, 11/12 shoulders, 13/14 elbows, 15/16 wrists,
// 17–22 hands, 23/24 hips, 25/26 knees, 27/28 ankles, 29/30 heels, 31/32 toes.
function standing(overrides: Record<number, Partial<Landmark>> = {}): Landmark[] {
  const points: Landmark[] = []
  const at = (x: number, y: number): Landmark => ({ x, y, visibility: 0.99 })
  points[0] = at(0.5, 0.15)
  for (let i = 1; i <= 10; i++) points[i] = at(0.48 + (i % 5) * 0.01, 0.13 + (i > 8 ? 0.03 : 0))
  points[11] = at(0.42, 0.28)
  points[12] = at(0.58, 0.28)
  points[13] = at(0.38, 0.4)
  points[14] = at(0.62, 0.4)
  points[15] = at(0.37, 0.5)
  points[16] = at(0.63, 0.5)
  for (let i = 17; i <= 22; i++) points[i] = at(i % 2 ? 0.36 : 0.64, 0.52)
  points[23] = at(0.45, 0.55)
  points[24] = at(0.55, 0.55)
  points[25] = at(0.45, 0.72)
  points[26] = at(0.55, 0.72)
  points[27] = at(0.45, 0.9)
  points[28] = at(0.55, 0.9)
  points[29] = at(0.44, 0.92)
  points[30] = at(0.56, 0.92)
  points[31] = at(0.46, 0.93)
  points[32] = at(0.54, 0.94)
  for (const [index, change] of Object.entries(overrides)) {
    points[Number(index)] = { ...points[Number(index)], ...change }
  }
  return points
}

const hidden = { visibility: 0.1 }

describe('poseFromLandmarks', () => {
  it('tags a standing dancer as full body and anchors head and feet', () => {
    const pose = poseFromLandmarks(standing())!
    expect(pose.source).toBe('pose')
    expect(pose.shots).toEqual(['full_body'])
    expect(pose.head).toEqual({ x: 0.5, y: 0.15 })
    expect(pose.feet).toEqual({ x: 0.54, y: 0.94 })
    // Headroom above the eyes, a margin under the toes.
    expect(pose.subject!.y).toBeCloseTo(0.03, 5)
    expect(pose.subject!.y + pose.subject!.h).toBeCloseTo(0.98, 5)
  })

  it('spots arms raised above the head', () => {
    const pose = poseFromLandmarks(standing({ 15: { y: 0.05 }, 16: { y: 0.04 } }))!
    expect(pose.shots).toContain('arms_up')
    expect(pose.subject!.y).toBe(0)
  })

  it('spots a kick when an ankle rises above the hips', () => {
    const pose = poseFromLandmarks(standing({ 28: { x: 0.8, y: 0.4 }, 30: { x: 0.82, y: 0.41 }, 32: { x: 0.85, y: 0.38 } }))!
    expect(pose.shots).toContain('kick')
    expect(pose.shots).toContain('full_body')
  })

  it('tags a head-and-shoulders crop as a headshot', () => {
    const hide: Record<number, Partial<Landmark>> = {}
    for (let i = 13; i <= 32; i++) hide[i] = hidden
    const pose = poseFromLandmarks(standing(hide))!
    expect(pose.shots).toEqual(['headshot'])
    expect(pose.feet).toBeUndefined()
  })

  it('tags a crop at the knees as three-quarter', () => {
    const hide: Record<number, Partial<Landmark>> = {}
    for (const i of [27, 28, 29, 30, 31, 32]) hide[i] = hidden
    const pose = poseFromLandmarks(standing(hide))!
    expect(pose.shots).toEqual(['three_quarter'])
  })

  it('tags legs without a face as detail', () => {
    const hide: Record<number, Partial<Landmark>> = {}
    for (let i = 0; i <= 12; i++) hide[i] = hidden
    const pose = poseFromLandmarks(standing(hide))!
    expect(pose.shots).toEqual(['detail'])
    expect(pose.head).toBeUndefined()
  })

  it('ignores landmarks far outside the frame', () => {
    const pose = poseFromLandmarks(standing({ 27: { y: 1.4 }, 28: { y: 1.5 }, 29: { y: 1.5 }, 30: { y: 1.5 }, 31: { y: 1.5 }, 32: { y: 1.5 } }))!
    expect(pose.shots).toEqual(['three_quarter'])
    expect(pose.feet).toBeUndefined()
  })

  it('gives up on partial results', () => {
    expect(poseFromLandmarks(standing().slice(0, 20))).toBeNull()
    const nearlyEmpty = standing(Object.fromEntries(Array.from({ length: 30 }, (_, i) => [i, hidden])))
    expect(poseFromLandmarks(nearlyEmpty)).toBeNull()
  })
})

describe('tag merging', () => {
  it('adds pose shots without dropping existing tags', () => {
    const merged = mergePoseTags(
      { orientation: 'portrait', shotTypes: ['kick'], background: 'studio' },
      { source: 'pose', shots: ['full_body', 'kick'] }
    )
    expect(merged).toEqual({ orientation: 'portrait', shotTypes: ['kick', 'full_body'], background: 'studio' })
  })

  it('keeps pose anchors over the vision box and pose shots over a miss', () => {
    const pose = { source: 'pose' as const, subject: { x: 0.2, y: 0.1, w: 0.5, h: 0.8 }, shots: ['full_body' as const] }
    const result = applyTagResult(
      { tags: { orientation: 'portrait' }, pose },
      {
        id: 'x',
        shot_types: ['arms_up'],
        background: 'plain_light',
        mood: 'poised',
        description: 'Black leotard, arms overhead.',
        subject: { x: 0, y: 0, w: 1, h: 1 },
      }
    )
    expect(result.pose).toBe(pose)
    expect(result.tags.shotTypes).toEqual(['arms_up', 'full_body'])
    expect(result.tags.orientation).toBe('portrait')
    expect(result.tags.background).toBe('plain_light')
  })

  it('falls back to the vision box, clamped, when pose detection found nothing', () => {
    const result = applyTagResult(
      { tags: {}, pose: null },
      {
        id: 'x',
        shot_types: [],
        background: 'studio',
        mood: 'm'.repeat(200),
        description: 'd'.repeat(400),
        subject: { x: -0.1, y: 0.2, w: 1.3, h: 0.7 },
      }
    )
    expect(result.pose).toEqual({ source: 'vision', subject: { x: 0, y: 0.2, w: 1, h: 0.7 } })
    expect(result.tags.mood).toHaveLength(80)
    expect(result.tags.description).toHaveLength(240)
  })

  it('scores slot fit by shot matches and orientation', () => {
    const tags = { orientation: 'portrait' as const, shotTypes: ['full_body' as const, 'kick' as const] }
    expect(slotFitScore(tags, ['full_body', 'kick'], true)).toBe(5)
    expect(slotFitScore(tags, ['headshot'], true)).toBe(1)
    expect(slotFitScore(tags, ['headshot'], false)).toBe(0)
    expect(slotFitScore(null, ['full_body'], true)).toBe(0)
  })
})

describe('AI pricing', () => {
  it('prices dated snapshots like their family and unknown models conservatively', () => {
    expect(priceFor('gpt-4.1-mini')).toEqual(priceFor('gpt-4.1-mini-2025-04-14'))
    expect(priceFor('some-new-model').output).toBeGreaterThanOrEqual(priceFor('gpt-4.1-mini').output)
  })

  it('counts cached input at the cached rate, in integer micro-dollars', () => {
    // 800 × $0.40 + 200 × $0.10 + 500 × $1.60, per million tokens.
    expect(costMicros('gpt-4.1-mini', { inputTokens: 1000, cachedInputTokens: 200, outputTokens: 500 })).toBe(1140)
    expect(Number.isInteger(costMicros('gpt-6-luna', { inputTokens: 7, cachedInputTokens: 0, outputTokens: 3 }))).toBe(true)
  })

  it('formats spend for people', () => {
    expect(formatMicros(0)).toBe('$0.00')
    expect(formatMicros(4_000)).toBe('<$0.01')
    expect(formatMicros(1_234_567)).toBe('$1.23')
  })
})

describe('upload helpers', () => {
  it('sends resumable uploads to the direct storage host', () => {
    expect(tusEndpoint('https://abcd.supabase.co')).toBe('https://abcd.storage.supabase.co/storage/v1/upload/resumable')
    expect(tusEndpoint('https://abcd.storage.supabase.co/')).toBe(
      'https://abcd.storage.supabase.co/storage/v1/upload/resumable'
    )
    expect(tusEndpoint('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321/storage/v1/upload/resumable')
  })

  it('caps originals at 16 MP and keeps the aspect ratio', () => {
    const [width, height] = capPixels(6000, 4000, 16_000_000)
    expect(width * height).toBeLessThanOrEqual(16_000_000)
    expect(width / height).toBeCloseTo(1.5, 2)
    expect(capPixels(4032, 3024, 16_000_000)).toEqual([4032, 3024])
  })

  it('scales renditions by the long edge and never upscales', () => {
    expect(fitLongEdge(3024, 4032, 1600)).toEqual([1200, 1600])
    expect(fitLongEdge(300, 200, 400)).toEqual([300, 200])
  })
})
