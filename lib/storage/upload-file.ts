'use client'

import { createClient } from '@/lib/supabase/client'
import type { UploadTarget } from './direct-upload'

/**
 * Sends a file straight to Supabase Storage at a target an `upload-url` route
 * issued. See lib/storage/direct-upload.ts for the whole flow.
 *
 * Storage records the Blob's own type, so pass `contentType` to store it under
 * a type the finishing route expects regardless of what the browser guessed.
 */
export async function uploadFile(target: UploadTarget, file: Blob, contentType?: string): Promise<void> {
  const body = contentType && file.type !== contentType ? new Blob([file], { type: contentType }) : file
  const { error } = await createClient()
    .storage.from(target.bucket)
    .uploadToSignedUrl(target.path, target.token, body, {
      cacheControl: target.cacheControl ?? '3600',
      contentType,
    })
  if (error) {
    console.error('Direct upload failed:', error)
    throw new Error('The upload didn’t finish. Check your connection and try again.')
  }
}

/** POSTs JSON to one of our API routes and returns the parsed reply, throwing the route's `error` message on failure. */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data as T
}
