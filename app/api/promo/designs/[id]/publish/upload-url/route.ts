import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createUploadTarget } from '@/lib/storage/direct-upload'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import { loadDesign, PUBLIC_ASSETS_BUCKET, PUBLISH_CACHE_CONTROL, publishPath } from '@/lib/promo/server/designs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/**
 * Where the browser should send the render it's about to publish. Then
 * POST ../publish with { path, classId }. Only the promo's owner gets one, and
 * the path sits under publicCopyPrefix, the only place publish will look.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
    const design = await loadDesign(supabase, id)
    if (design.owner_id !== ownerId) throw new PromoError('Only the promo’s owner can publish it.', 403, 'not_owner')

    const target = await createUploadTarget(
      createAdminClient(),
      PUBLIC_ASSETS_BUCKET,
      publishPath(ownerId, design),
      PUBLISH_CACHE_CONTROL
    )
    return NextResponse.json({ target })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/publish/upload-url')
  }
}
