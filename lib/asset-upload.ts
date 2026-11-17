// Rules for instructor asset uploads (/instructor/assets, the class image
// picker). Both the upload-url route and the finishing POST /api/assets check
// them: the first against what the browser says it will send, the second
// against what Storage actually received.

export const ASSET_BUCKET = 'assets'
export const ASSET_MAX_BYTES = 10 * 1024 * 1024
export const ASSET_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']

const EXTENSION_FOR_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

/** Why this file can't be an asset, or null when it can. */
export function assetFileProblem(contentType: unknown, size: unknown): string | null {
  if (typeof contentType !== 'string' || !ASSET_TYPES.includes(contentType)) {
    return 'Invalid file type. Only images and PDFs are allowed.'
  }
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return 'The file is empty.'
  if (size > ASSET_MAX_BYTES) return 'File size must be less than 10MB'
  return null
}

export function assetExtension(contentType: string): string {
  return EXTENSION_FOR_TYPE[contentType] ?? 'bin'
}

/** Every asset a profile uploads lives in its own folder, which the finishing route insists on. */
export function assetFolder(profileId: string): string {
  return `${profileId}/`
}
