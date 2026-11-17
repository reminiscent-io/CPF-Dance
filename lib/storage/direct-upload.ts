// Files go from the browser straight to Supabase Storage, never through an API
// route: Vercel rejects any request body over 4.5 MB before the route runs.
//
// The flow, for every upload:
//   1. An `upload-url` route authorizes the caller, picks the storage path and
//      returns an UploadTarget (a signed upload token for exactly that path).
//   2. The browser sends the file with uploadFile() (lib/storage/upload-file.ts).
//   3. The finishing route gets `{ path }` as JSON, checks the path is one it
//      could have issued to this caller (isPathUnder), and reads the file's
//      size and type back from Storage before trusting it.
//
// A signed upload token bypasses storage RLS, so the route that mints it is
// the authorization check. Tokens last two hours and fit one path only.

import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

export interface UploadTarget {
  bucket: string
  path: string
  token: string
  /** Cache-Control max-age in seconds, when the server wants something other than Supabase's default. */
  cacheControl?: string
}

export async function createUploadTarget(
  admin: AdminClient,
  bucket: string,
  path: string,
  cacheControl?: string
): Promise<UploadTarget> {
  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) throw error ?? new Error(`No upload URL for ${bucket}/${path}`)
  return { bucket, path, token: data.token, ...(cacheControl ? { cacheControl } : {}) }
}

/**
 * True when `path` is a plain file name directly under `prefix`: no
 * subfolders, no `..`. Finishing routes use it to refuse a path the matching
 * upload-url route would never have handed this caller.
 */
export function isPathUnder(path: unknown, prefix: string): path is string {
  if (typeof path !== 'string' || !path.startsWith(prefix)) return false
  const name = path.slice(prefix.length)
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes('..')
}

/** The lower-cased extension of `fileName` when it looks like one, else `fallback`. */
export function safeExtension(fileName: unknown, fallback: string): string {
  if (typeof fileName !== 'string' || !fileName.includes('.')) return fallback
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : fallback
}
