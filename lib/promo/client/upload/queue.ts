'use client'

import { createStore, del, get, keys, set, type UseStore } from 'idb-keyval'
import * as tus from 'tus-js-client'
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { AssetPose, PromoAsset } from '../../types'
import { detectPose } from '../pose'
import { normalizePhoto, releaseCanvas } from './normalize'

/**
 * Upload queue for the photo library.
 *
 * Each photo is prepared on the device (normalize.ts), then its three files
 * upload one photo at a time: thumbnail and display rendition as plain
 * uploads, the original over TUS so a dropped cellular connection resumes
 * where it stopped. Prepared files wait in IndexedDB, so a reload or a
 * crashed tab picks up the queue without re-picking photos. The row is
 * registered last, once every file has landed.
 */

const BUCKET = 'promo-private'
const TUS_CHUNK = 6 * 1024 * 1024 // Supabase requires exactly 6 MB chunks.

export type UploadStatus = 'preparing' | 'waiting' | 'uploading' | 'saving' | 'done' | 'duplicate' | 'error'

export interface UploadItem {
  id: string
  filename: string
  status: UploadStatus
  progress: number
  error?: string
  previewUrl?: string
}

interface StoredUpload {
  id: string
  ownerId: string
  filename: string
  sha256: string
  width: number
  height: number
  pose: AssetPose | null
  createdAt: number
  original: Blob
  display: Blob
  thumb: Blob
  done: { thumb: boolean; display: boolean; original: boolean }
}

interface QueueState {
  items: UploadItem[]
  running: boolean
}

export const useUploadQueue = create<QueueState>(() => ({ items: [], running: false }))

let idb: UseStore | null | undefined
function store(): UseStore | null {
  if (idb === undefined) {
    try {
      idb = typeof indexedDB === 'undefined' ? null : createStore('cpf-promo-uploads', 'uploads')
    } catch {
      idb = null
    }
  }
  return idb
}

const memory = new Map<string, StoredUpload>()
const listeners = new Set<(asset: PromoAsset) => void>()

/** Called with each asset as it's registered and again when its tags arrive. */
export function onAssetChanged(listener: (asset: PromoAsset) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(asset: PromoAsset) {
  for (const listener of listeners) listener(asset)
}

function patch(id: string, update: Partial<UploadItem>) {
  useUploadQueue.setState((state) => ({
    items: state.items.map((item) => (item.id === id ? { ...item, ...update } : item)),
  }))
}

async function persist(upload: StoredUpload) {
  memory.set(upload.id, upload)
  const db = store()
  if (db) {
    try {
      await set(upload.id, upload, db)
    } catch {
      // Private browsing or a full disk: the in-memory copy still uploads.
    }
  }
}

async function forget(id: string) {
  memory.delete(id)
  const db = store()
  if (db) await del(id, db).catch(() => undefined)
}

async function load(id: string): Promise<StoredUpload | undefined> {
  const cached = memory.get(id)
  if (cached) return cached
  const db = store()
  return db ? ((await get(id, db)) as StoredUpload | undefined) : undefined
}

function message(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Upload failed. It will retry.'
}

/** Prepares picked files one at a time (bounded memory) and starts uploading as soon as the first is ready. */
export async function enqueueFiles(files: File[], ownerId: string): Promise<void> {
  const entries = files.map((file) => ({ id: crypto.randomUUID(), file }))
  useUploadQueue.setState((state) => ({
    items: [
      ...entries.map(({ id, file }) => ({ id, filename: file.name, status: 'preparing' as const, progress: 0 })),
      ...state.items,
    ],
  }))
  for (const { id, file } of entries) {
    try {
      const prepared = await normalizePhoto(file)
      const pose = await detectPose(prepared.poseCanvas).catch(() => null)
      releaseCanvas(prepared.poseCanvas)
      await persist({
        id,
        ownerId,
        filename: file.name,
        sha256: prepared.sha256,
        width: prepared.width,
        height: prepared.height,
        pose,
        createdAt: Date.now(),
        original: prepared.original,
        display: prepared.display,
        thumb: prepared.thumb,
        done: { thumb: false, display: false, original: false },
      })
      patch(id, { status: 'waiting', previewUrl: URL.createObjectURL(prepared.thumb) })
    } catch (error) {
      patch(id, { status: 'error', error: message(error) })
    }
    void runQueue()
  }
}

/** Picks up photos that were still uploading when the page closed. */
export async function resumeUploads(ownerId: string): Promise<void> {
  const db = store()
  if (!db) return
  let ids: IDBValidKey[] = []
  try {
    ids = await keys(db)
  } catch {
    return
  }
  const known = new Set(useUploadQueue.getState().items.map((item) => item.id))
  const resumed: UploadItem[] = []
  for (const key of ids) {
    const upload = (await get(key, db)) as StoredUpload | undefined
    if (!upload || upload.ownerId !== ownerId || known.has(upload.id)) continue
    memory.set(upload.id, upload)
    resumed.push({
      id: upload.id,
      filename: upload.filename,
      status: 'waiting',
      progress: 0,
      previewUrl: URL.createObjectURL(upload.thumb),
    })
  }
  if (resumed.length === 0) return
  useUploadQueue.setState((state) => ({ items: [...resumed, ...state.items] }))
  void runQueue()
}

export function retryFailed() {
  useUploadQueue.setState((state) => ({
    items: state.items.map((item) =>
      item.status === 'error' && memory.has(item.id) ? { ...item, status: 'waiting', error: undefined } : item
    ),
  }))
  void runQueue()
}

export function clearFinished() {
  const { items } = useUploadQueue.getState()
  for (const item of items) {
    if ((item.status === 'done' || item.status === 'duplicate' || item.status === 'error') && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
  }
  useUploadQueue.setState({
    items: items.filter((item) => !['done', 'duplicate'].includes(item.status) && !(item.status === 'error' && !memory.has(item.id))),
  })
}

let wakeLock: WakeLockSentinel | null = null

async function holdWakeLock() {
  try {
    wakeLock = (await navigator.wakeLock?.request('screen')) ?? null
  } catch {
    wakeLock = null
  }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => undefined)
  wakeLock = null
}

if (typeof window !== 'undefined') {
  // Back online after a dead zone: try the failed ones again.
  window.addEventListener('online', () => retryFailed())
  // iOS drops the wake lock when the page hides; take it back on return.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && useUploadQueue.getState().running && !wakeLock) {
      void holdWakeLock()
    }
  })
}

async function runQueue() {
  if (useUploadQueue.getState().running) return
  useUploadQueue.setState({ running: true })
  await holdWakeLock()
  const toTag: string[] = []
  try {
    for (;;) {
      const next = useUploadQueue.getState().items.find((item) => item.status === 'waiting')
      if (!next) break
      const upload = await load(next.id)
      if (!upload) {
        patch(next.id, { status: 'error', error: 'This photo was lost. Add it again.' })
        continue
      }
      try {
        const { asset, duplicate } = await uploadOne(upload)
        await forget(upload.id)
        patch(upload.id, { status: duplicate ? 'duplicate' : 'done', progress: 1 })
        notify(asset)
        if (!duplicate) toTag.push(asset.id)
        if (toTag.length >= 10) await tagBatch(toTag.splice(0))
      } catch (error) {
        patch(upload.id, { status: 'error', error: message(error) })
      }
    }
    if (toTag.length > 0) await tagBatch(toTag.splice(0))
  } finally {
    useUploadQueue.setState({ running: false })
    releaseWakeLock()
  }
}

async function uploadOne(upload: StoredUpload): Promise<{ asset: PromoAsset; duplicate: boolean }> {
  const supabase = createClient()
  const base = `${upload.ownerId}/assets/${upload.id}`
  const total = upload.original.size + upload.display.size + upload.thumb.size
  let sent = 0
  patch(upload.id, { status: 'uploading', progress: 0 })

  for (const key of ['thumb', 'display'] as const) {
    if (!upload.done[key]) {
      const { error } = await supabase.storage.from(BUCKET).upload(`${base}/${key}.jpg`, upload[key], {
        upsert: true,
        contentType: 'image/jpeg',
        cacheControl: '3600',
      })
      if (error) throw new Error(error.message || 'Upload failed. It will retry.')
      upload.done[key] = true
      await persist(upload)
    }
    sent += upload[key].size
    patch(upload.id, { progress: sent / total })
  }

  if (!upload.done.original) {
    await tusUpload(upload, `${base}/original.jpg`, (bytes) => patch(upload.id, { progress: (sent + bytes) / total }))
    upload.done.original = true
    await persist(upload)
  }

  patch(upload.id, { status: 'saving' })
  const response = await fetch('/api/promo/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: upload.id,
      sha256: upload.sha256,
      width: upload.width,
      height: upload.height,
      bytes: upload.original.size,
      originalFilename: upload.filename,
      pose: upload.pose,
    }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Couldn’t save the photo. It will retry.')
  return { asset: body.asset as PromoAsset, duplicate: Boolean(body.duplicate) }
}

/** Supabase recommends the direct storage hostname for resumable uploads. */
export function tusEndpoint(supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''): string {
  try {
    const url = new URL(supabaseUrl)
    if (url.hostname.endsWith('.supabase.co') && !url.hostname.endsWith('.storage.supabase.co')) {
      url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co')
    }
    return `${url.origin}/storage/v1/upload/resumable`
  } catch {
    return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`
  }
}

async function tusUpload(upload: StoredUpload, objectName: string, onBytes: (bytes: number) => void): Promise<void> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Please sign in again to keep uploading.')
  // Stable name and lastModified keep tus's fingerprint the same after a reload.
  const file = new File([upload.original], `${upload.id}-original.jpg`, {
    type: 'image/jpeg',
    lastModified: upload.createdAt,
  })
  await new Promise<void>((resolve, reject) => {
    const tusUploader = new tus.Upload(file, {
      endpoint: tusEndpoint(),
      retryDelays: [0, 3000, 5000, 10000, 20000, 30000, 60000],
      headers: {
        authorization: `Bearer ${data.session!.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        'x-upsert': 'true',
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK,
      metadata: { bucketName: BUCKET, objectName, contentType: 'image/jpeg', cacheControl: '3600' },
      // Tokens last an hour; a long upload on a slow connection can outlive one.
      onBeforeRequest: async (request) => {
        const { data: fresh } = await supabase.auth.getSession()
        if (fresh.session) request.setHeader('authorization', `Bearer ${fresh.session.access_token}`)
      },
      onProgress: (bytesSent) => onBytes(bytesSent),
      onError: (error) => reject(error),
      onSuccess: () => resolve(),
    })
    tusUploader
      .findPreviousUploads()
      .then((previous) => {
        if (previous.length > 0) tusUploader.resumeFromPreviousUpload(previous[0])
        tusUploader.start()
      })
      .catch(reject)
  })
}

async function tagBatch(ids: string[]) {
  try {
    const response = await fetch('/api/promo/assets/tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!response.ok) return
    const body = (await response.json()) as { assets?: PromoAsset[] }
    for (const asset of body.assets ?? []) notify(asset)
  } catch {
    // Tags are a convenience; photos are already saved. She can tag by hand.
  }
}
