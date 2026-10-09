import { createAdminClient } from '@/lib/supabase/admin'
import { PromoError } from '../server/context'

/**
 * AI spend tracking. Rows go in with the service role only (the table has no
 * insert policy), after the route has authorized the caller, so nobody can
 * edit or erase their own spend.
 */

export type AiCallKind = 'tag' | 'generate' | 'revise' | 'shorten' | 'photo_edit'
export type AiCallStatus = 'ok' | 'invalid' | 'error' | 'capped'

export interface AiCallEntry {
  ownerId: string
  kind: AiCallKind
  model: string
  status: AiCallStatus
  inputTokens?: number
  cachedInputTokens?: number
  outputTokens?: number
  costMicros?: number
  latencyMs?: number
  designId?: string | null
  assetId?: string | null
  errorCode?: string | null
}

/** Writes one row; returns its id, or null if logging itself failed (never blocks the user). */
export async function logAiCall(entry: AiCallEntry): Promise<string | null> {
  try {
    const { data, error } = await createAdminClient()
      .from('promo_ai_calls')
      .insert({
        owner_id: entry.ownerId,
        kind: entry.kind,
        model: entry.model,
        status: entry.status,
        input_tokens: entry.inputTokens ?? 0,
        cached_input_tokens: entry.cachedInputTokens ?? 0,
        output_tokens: entry.outputTokens ?? 0,
        cost_micros: entry.costMicros ?? 0,
        latency_ms: entry.latencyMs ?? null,
        design_id: entry.designId ?? null,
        asset_id: entry.assetId ?? null,
        error_code: entry.errorCode ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  } catch (error) {
    console.error('[promo] failed to log AI call:', error)
    return null
  }
}

/** First day of the current month in the studio's timezone, as YYYY-MM-01. */
export function currentStudioMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  return `${year}-${month}-01`
}

export function defaultCapMicros(): number {
  const raw = Number(process.env.PROMO_AI_DEFAULT_CAP_USD ?? '10')
  const dollars = Number.isFinite(raw) && raw >= 0 ? raw : 10
  return Math.round(dollars * 1_000_000)
}

export async function monthlySpend(ownerId: string): Promise<{ spentMicros: number; capMicros: number }> {
  const admin = createAdminClient()
  const [{ data: rows, error: spendError }, { data: budget, error: budgetError }] = await Promise.all([
    admin.from('promo_ai_monthly').select('cost_micros').eq('owner_id', ownerId).eq('month', currentStudioMonth()),
    admin.from('promo_ai_budgets').select('monthly_cap_micros').eq('owner_id', ownerId).maybeSingle(),
  ])
  if (spendError) throw spendError
  if (budgetError) throw budgetError
  const spentMicros = (rows ?? []).reduce((sum, row) => sum + Number(row.cost_micros ?? 0), 0)
  const capMicros = budget ? Number(budget.monthly_cap_micros) : defaultCapMicros()
  return { spentMicros, capMicros }
}

/** Throws a 402 the UI explains ("editing still works") when the month's cap is reached. */
export async function assertWithinBudget(ownerId: string, kind: AiCallKind): Promise<void> {
  const { spentMicros, capMicros } = await monthlySpend(ownerId)
  if (spentMicros >= capMicros) {
    await logAiCall({ ownerId, kind, model: 'none', status: 'capped', errorCode: 'monthly_cap' })
    throw new PromoError(
      'This month’s AI budget is used up. Editing and exports still work. An admin can raise the cap on the AI usage page.',
      402,
      'monthly_cap'
    )
  }
}
