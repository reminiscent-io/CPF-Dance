'use client'

import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { poseFromLandmarks } from '../tags'
import type { AssetPose } from '../types'

/**
 * Optional pose detection at upload: MediaPipe's Pose Landmarker (Apache-2.0,
 * lite model about 5.5 MB) finds the body's landmarks so crops keep her head
 * and feet in frame and shots get tagged (kick, arms up, full body) for free.
 * Runs on her device; the photo isn't sent anywhere. If the model can't load,
 * uploads carry on and tagging falls back to the vision model.
 */

const WASM_BASE =
  process.env.NEXT_PUBLIC_PROMO_POSE_WASM_URL || 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm'
const MODEL_URL =
  process.env.NEXT_PUBLIC_PROMO_POSE_MODEL_URL ||
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

let landmarker: Promise<PoseLandmarker | null> | null = null

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))])
}

async function create(): Promise<PoseLandmarker | null> {
  try {
    const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE)
    const options = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'IMAGE' as const,
      numPoses: 1,
    })
    try {
      return await PoseLandmarker.createFromOptions(fileset, options('GPU'))
    } catch {
      return await PoseLandmarker.createFromOptions(fileset, options('CPU'))
    }
  } catch (error) {
    console.warn('[promo] pose detection unavailable:', error)
    return null
  }
}

export async function detectPose(source: HTMLCanvasElement): Promise<AssetPose | null> {
  landmarker ??= create()
  const instance = await withTimeout(landmarker, 20_000)
  if (!instance) return null
  try {
    const result = instance.detect(source)
    const first = result.landmarks[0]
    return first ? poseFromLandmarks(first) : null
  } catch (error) {
    console.warn('[promo] pose detection failed:', error)
    return null
  }
}
