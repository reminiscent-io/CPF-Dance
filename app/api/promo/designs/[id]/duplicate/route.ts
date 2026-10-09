import { NextRequest, NextResponse } from 'next/server'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import { DESIGN_COLUMNS, loadDesign } from '@/lib/promo/server/designs'

export const dynamic = 'force-dynamic'

/** A copy in a new group, so its formats and publishing are separate from the original's. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
    const source = await loadDesign(supabase, id)

    const { data: design, error } = await supabase
      .from('promo_designs')
      .insert({
        owner_id: ownerId,
        title: `${source.title} (copy)`.slice(0, 200),
        template_version_id: source.template_version_id,
        format: source.format,
        class_ids: source.class_ids,
        brief: source.brief,
        document: source.document,
        brand_snapshot: source.brand_snapshot,
      })
      .select(DESIGN_COLUMNS)
      .single()
    if (error) throw error
    return NextResponse.json({ design }, { status: 201 })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/duplicate')
  }
}
