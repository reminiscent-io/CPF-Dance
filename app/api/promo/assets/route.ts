import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AssetPoseSchema } from '@/lib/promo/schema'
import { mergePoseTags } from '@/lib/promo/tags'
import {
  ASSET_COLUMNS,
  assetPaths,
  PROMO_BUCKET,
  PromoError,
  promoErrorResponse,
  requirePromoInstructor,
} from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

/** Her library, newest first, plus storage used against the Free plan's 1 GB. */
export async function GET() {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const { data, error } = await supabase
      .from('promo_assets')
      .select(ASSET_COLUMNS)
      .eq('owner_id', ownerId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    const assets = data ?? []
    // Display and thumbnail renditions add roughly 6% on top of the originals.
    const bytesUsed = Math.round(assets.reduce((sum, asset) => sum + Number(asset.bytes ?? 0), 0) * 1.06)
    return NextResponse.json({ assets, bytesUsed })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/promo/assets')
  }
}

const FinalizeSchema = z.object({
  id: z.guid(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(20000),
  bytes: z.number().int().min(0).max(60 * 1024 * 1024),
  originalFilename: z.string().max(200).nullable().optional(),
  pose: AssetPoseSchema.nullable().optional(),
})

/**
 * Registers a photo once its three files are in storage. The server derives
 * the paths from the owner and asset id, so a client can't point a row at
 * someone else's files (the table's CHECK constraint enforces it too).
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const parsed = FinalizeSchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('That upload is missing details. Try again.', 400)
    const input = parsed.data
    const paths = assetPaths(ownerId, input.id)

    const { data: files, error: listError } = await supabase.storage
      .from(PROMO_BUCKET)
      .list(`${ownerId}/assets/${input.id}`)
    if (listError) throw listError
    const names = new Set((files ?? []).map((file) => file.name))
    if (!['original.jpg', 'display.jpg', 'thumb.jpg'].every((name) => names.has(name))) {
      throw new PromoError('The upload didn’t finish. It will retry.', 409, 'incomplete')
    }

    // Same photo uploaded before: keep the existing row and drop the new copy.
    const { data: existing } = await supabase
      .from('promo_assets')
      .select(ASSET_COLUMNS)
      .eq('owner_id', ownerId)
      .eq('sha256', input.sha256)
      .is('parent_id', null)
      .maybeSingle()
    if (existing && existing.id !== input.id) {
      await supabase.storage
        .from(PROMO_BUCKET)
        .remove([paths.original_path, paths.display_path, paths.thumb_path])
      return NextResponse.json({ asset: existing, duplicate: true })
    }

    // A retry after a lost response finds its own row: return it as it is now,
    // tags included, instead of writing it again.
    if (existing && existing.id === input.id) return NextResponse.json({ asset: existing })

    const orientation =
      input.width === input.height ? 'square' : input.width > input.height ? 'landscape' : 'portrait'
    const pose = input.pose ?? null
    const { data: asset, error } = await supabase
      .from('promo_assets')
      .insert({
        id: input.id,
        owner_id: ownerId,
        ...paths,
        width: input.width,
        height: input.height,
        bytes: input.bytes,
        sha256: input.sha256,
        original_filename: input.originalFilename ?? null,
        pose,
        tags: mergePoseTags({ orientation }, pose),
      })
      .select(ASSET_COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/assets')
  }
}
