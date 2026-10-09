/**
 * List prices per 1M tokens, used to estimate each call's cost for the
 * monthly cap and the admin usage page. Checked 2026-10-08 (LiteLLM's price
 * table and OpenAI's launch posts). Update the date and numbers when OpenAI
 * changes prices; estimates for unknown models use the conservative row.
 */
export const PRICES_CHECKED = '2026-10-08'

export interface TokenPrice {
  input: number
  cachedInput: number
  output: number
}

const PRICES: Record<string, TokenPrice> = {
  'gpt-6-luna': { input: 0.1, cachedInput: 0.01, output: 0.5 },
  'gpt-5.6-luna': { input: 0.2, cachedInput: 0.02, output: 1.2 },
  'gpt-5.6-terra': { input: 0.75, cachedInput: 0.075, output: 4.5 },
  'gpt-5.4-mini': { input: 0.75, cachedInput: 0.075, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, cachedInput: 0.02, output: 1.25 },
  'gpt-5-mini': { input: 0.25, cachedInput: 0.025, output: 2 },
  'gpt-5-nano': { input: 0.05, cachedInput: 0.005, output: 0.4 },
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6 },
  // Image models: text input / image output rates (Phase 6).
  'gpt-image-2': { input: 8, cachedInput: 2, output: 30 },
  'gpt-image-2.5-flare': { input: 8, cachedInput: 2, output: 30 },
}

const CONSERVATIVE: TokenPrice = { input: 1, cachedInput: 0.1, output: 5 }

export function priceFor(model: string): TokenPrice {
  if (PRICES[model]) return PRICES[model]
  // Dated snapshots ("gpt-6-luna-2026-09-22") price like their family.
  const family = Object.keys(PRICES).find((key) => model.startsWith(`${key}-`))
  return family ? PRICES[family] : CONSERVATIVE
}

export interface Usage {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
}

/** Cost in integer micro-dollars (1 = $0.000001). */
export function costMicros(model: string, usage: Usage): number {
  const price = priceFor(model)
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens)
  const dollars =
    (uncached * price.input + usage.cachedInputTokens * price.cachedInput + usage.outputTokens * price.output) /
    1_000_000
  return Math.round(dollars * 1_000_000)
}

export function microsToDollars(micros: number): number {
  return micros / 1_000_000
}

export function formatMicros(micros: number): string {
  const dollars = micros / 1_000_000
  if (dollars === 0) return '$0.00'
  if (dollars < 0.01) return '<$0.01'
  return `$${dollars.toFixed(2)}`
}
