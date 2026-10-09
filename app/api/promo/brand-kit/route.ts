import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { completeBrandTokens } from '@/lib/promo/brand'
import { BrandTokensSchema, checkBrandFonts } from '@/lib/promo/schema'
import { ensurePromoCatalog, loadStudioBrand } from '@/lib/promo/server/catalog'
import { PromoError, promoErrorResponse, requirePromoAdmin, requirePromoInstructor } from '@/lib/promo/server/context'
import type { BrandTokens } from '@/lib/promo/types'

export const dynamic = 'force-dynamic'

/** The studio brand kit new promos copy from. */
export async function GET() {
  try {
    const { supabase } = await requirePromoInstructor()
    return NextResponse.json({ tokens: await loadStudioBrand(supabase) })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/promo/brand-kit')
  }
}

const BodySchema = z.object({ tokens: BrandTokensSchema })

/**
 * Admins edit the studio kit. Saved promos keep the snapshot they were made
 * with; only promos created after this see the change.
 */
export async function PUT(request: NextRequest) {
  try {
    const { supabase, profile } = await requirePromoAdmin()
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      throw new PromoError(parsed.error.issues[0]?.message ?? 'Some brand values aren’t valid.', 400, 'bad_brand')
    }
    const tokens = completeBrandTokens(parsed.data.tokens as BrandTokens)
    const fontProblems = checkBrandFonts(tokens)
    if (fontProblems.length) throw new PromoError(fontProblems[0], 400, 'bad_font')

    await ensurePromoCatalog()
    const { data, error } = await supabase
      .from('promo_brand_kits')
      .update({ tokens, updated_by: profile.id })
      .is('owner_id', null)
      .select('tokens, updated_at')
    if (error) throw error
    if (!data || data.length === 0) throw new PromoError('The studio brand kit is missing.', 404)
    return NextResponse.json({ tokens: data[0].tokens, updatedAt: data[0].updated_at })
  } catch (error) {
    return promoErrorResponse(error, 'PUT /api/promo/brand-kit')
  }
}
