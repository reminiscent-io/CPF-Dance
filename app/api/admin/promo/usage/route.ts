import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { currentStudioMonth, defaultCapMicros } from '@/lib/promo/ai/log'
import { PRICES_CHECKED } from '@/lib/promo/ai/pricing'
import { textModels } from '@/lib/promo/ai/structured'
import { PromoError, promoErrorResponse, requirePromoAdmin } from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

function monthsBack(month: string, count: number): string {
  const [year, mon] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, mon - 1 - count, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/** AI spend by instructor and kind for six months, caps, and the latest calls. */
export async function GET() {
  try {
    const { supabase } = await requirePromoAdmin()
    const month = currentStudioMonth()
    const [monthly, budgets, calls] = await Promise.all([
      supabase
        .from('promo_ai_monthly')
        .select('owner_id, month, kind, calls, cost_micros')
        .gte('month', monthsBack(month, 5))
        .order('month', { ascending: false }),
      supabase.from('promo_ai_budgets').select('owner_id, monthly_cap_micros, updated_at'),
      supabase
        .from('promo_ai_calls')
        .select('id, owner_id, kind, model, status, input_tokens, output_tokens, cost_micros, latency_ms, error_code, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (monthly.error) throw monthly.error
    if (budgets.error) throw budgets.error
    if (calls.error) throw calls.error

    const ownerIds = [
      ...new Set([...(monthly.data ?? []), ...(budgets.data ?? []), ...(calls.data ?? [])].map((row) => row.owner_id as string)),
    ]
    const { data: owners, error: ownerError } = ownerIds.length
      ? await supabase.from('profiles').select('id, full_name, email').in('id', ownerIds)
      : { data: [], error: null }
    if (ownerError) throw ownerError

    return NextResponse.json({
      month,
      defaultCapMicros: defaultCapMicros(),
      pricesChecked: PRICES_CHECKED,
      models: textModels(),
      monthly: monthly.data ?? [],
      budgets: budgets.data ?? [],
      calls: calls.data ?? [],
      owners: owners ?? [],
    })
  } catch (error) {
    return promoErrorResponse(error, 'GET /api/admin/promo/usage')
  }
}

const CapSchema = z.object({ ownerId: z.guid(), capUsd: z.number().min(0).max(1000) })

/** Sets an instructor's monthly AI cap. */
export async function PUT(request: NextRequest) {
  try {
    const { supabase, profile } = await requirePromoAdmin()
    const parsed = CapSchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('Enter a cap between $0 and $1,000.', 400)
    const { data, error } = await supabase
      .from('promo_ai_budgets')
      .upsert(
        {
          owner_id: parsed.data.ownerId,
          monthly_cap_micros: Math.round(parsed.data.capUsd * 1_000_000),
          updated_by: profile.id,
        },
        { onConflict: 'owner_id' }
      )
      .select('owner_id, monthly_cap_micros, updated_at')
      .single()
    if (error) throw error
    return NextResponse.json({ budget: data })
  } catch (error) {
    return promoErrorResponse(error, 'PUT /api/admin/promo/usage')
  }
}
