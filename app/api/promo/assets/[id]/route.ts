import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { AssetTagsSchema } from '@/lib/promo/schema'
import {
  ASSET_COLUMNS,
  isUuid,
  PROMO_BUCKET,
  PromoError,
  promoErrorResponse,
  requirePromoInstructor,
} from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

const PatchSchema = z.object({
  favorite: z.boolean().optional(),
  tags: AssetTagsSchema.pick({ shotTypes: true, background: true }).optional(),
})

/** Favorite a photo, or correct its tags (which stops automatic re-tagging). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Photo not found.', 404)
    const parsed = PatchSchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('Those changes aren’t valid.', 400)

    const { data: current, error: readError } = await supabase
      .from('promo_assets')
      .select('tags')
      .eq('id', id)
      .maybeSingle()
    if (readError) throw readError
    if (!current) throw new PromoError('Photo not found.', 404)

    const update: Record<string, unknown> = {}
    if (parsed.data.favorite !== undefined) update.favorite = parsed.data.favorite
    if (parsed.data.tags) {
      update.tags = { ...(current.tags ?? {}), ...parsed.data.tags }
      update.tags_edited = true
    }
    const { data: asset, error } = await supabase
      .from('promo_assets')
      .update(update)
      .eq('id', id)
      .select(ASSET_COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ asset })
  } catch (error) {
    return promoErrorResponse(error, 'PATCH /api/promo/assets/[id]')
  }
}

/**
 * Deletes the photo for real: every rendition leaves storage and the row
 * goes. Designs that used it show an empty frame until she picks another.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Photo not found.', 404)

    const { data: asset, error: readError } = await supabase
      .from('promo_assets')
      .select('id, original_path, display_path, thumb_path, matte_path')
      .eq('id', id)
      .maybeSingle()
    if (readError) throw readError
    if (!asset) throw new PromoError('Photo not found.', 404)

    const { data: children } = await supabase
      .from('promo_assets')
      .select('original_path, display_path, thumb_path, matte_path')
      .eq('parent_id', id)
    const paths = [asset, ...(children ?? [])]
      .flatMap((row) => [row.original_path, row.display_path, row.thumb_path, row.matte_path])
      .filter((path): path is string => Boolean(path))
    const { error: removeError } = await supabase.storage.from(PROMO_BUCKET).remove([...new Set(paths)])
    if (removeError) throw removeError

    const { error } = await supabase.from('promo_assets').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return promoErrorResponse(error, 'DELETE /api/promo/assets/[id]')
  }
}
