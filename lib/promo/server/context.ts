import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, type ProfileWithRole } from '@/lib/auth/server-auth'

/**
 * Every Promo Studio route starts here. getCurrentUserWithRole() resolves a
 * linked login to its primary profile, so `ownerId` is the same id the RLS
 * helper promo_owner_id() returns, whichever email Courtney signed in with.
 */
export interface PromoContext {
  profile: ProfileWithRole
  ownerId: string
  isAdmin: boolean
  supabase: Awaited<ReturnType<typeof createClient>>
}

export async function requirePromoInstructor(): Promise<PromoContext> {
  const profile = await requireRole('instructor')
  const supabase = await createClient()
  return { profile, ownerId: profile.id, isAdmin: profile.role === 'admin', supabase }
}

export async function requirePromoAdmin(): Promise<PromoContext> {
  const profile = await requireRole('admin')
  const supabase = await createClient()
  return { profile, ownerId: profile.id, isAdmin: true, supabase }
}

export class PromoError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
  }
}

/** Maps guard errors to 401/403 and anything unexpected to a logged 500. */
export function promoErrorResponse(error: unknown, context: string) {
  if (error instanceof PromoError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : ''
  if (message.startsWith('Unauthorized')) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  }
  if (message.startsWith('Forbidden')) {
    return NextResponse.json({ error: 'You don’t have access to this.' }, { status: 403 })
  }
  console.error(`[promo] ${context}:`, error)
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value)
}

export function assetPaths(ownerId: string, assetId: string) {
  const base = `${ownerId}/assets/${assetId}`
  return {
    original_path: `${base}/original.jpg`,
    display_path: `${base}/display.jpg`,
    thumb_path: `${base}/thumb.jpg`,
  }
}

export function designThumbPath(ownerId: string, designId: string) {
  return `${ownerId}/designs/${designId}/thumb.jpg`
}

export const PROMO_BUCKET = 'promo-private'

export const ASSET_COLUMNS =
  'id, owner_id, parent_id, status, original_path, display_path, thumb_path, width, height, bytes, original_filename, tags, pose, tags_edited, tagged_at, favorite, created_at'
