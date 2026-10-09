import { NextRequest, NextResponse } from 'next/server'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

/**
 * The editor uploads a small JPEG to {owner}/designs/{id}/thumb.jpg itself
 * (her session, her folder), then stamps the time here so the history page
 * knows to fetch the new one. No revision bump: thumbnails aren't edits.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
    const { data, error } = await supabase
      .from('promo_designs')
      .update({ thumbnail_updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('thumbnail_updated_at')
    if (error) throw error
    if (!data || data.length === 0) throw new PromoError('Promo not found.', 404, 'not_found')
    return NextResponse.json(data[0])
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/thumbnail')
  }
}
