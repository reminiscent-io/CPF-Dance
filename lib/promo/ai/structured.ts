import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import type { z } from 'zod'
import { PromoError } from '../server/context'
import { logAiCall, type AiCallKind } from './log'
import { costMicros } from './pricing'

/**
 * One structured-output call through the Responses API with a strict JSON
 * schema, logged with tokens and estimated cost whether it succeeds or not.
 *
 * The model comes from PROMO_TEXT_MODEL (default gpt-6-luna). If the API
 * rejects that model, the call retries once on PROMO_TEXT_FALLBACK_MODEL
 * (default gpt-4.1-mini) and the process remembers the switch.
 */

export const DEFAULT_TEXT_MODEL = 'gpt-6-luna'
export const DEFAULT_FALLBACK_MODEL = 'gpt-4.1-mini'

let primaryRejected = false

export function textModels(): { primary: string; fallback: string } {
  return {
    primary: process.env.PROMO_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL,
    fallback: process.env.PROMO_TEXT_FALLBACK_MODEL?.trim() || DEFAULT_FALLBACK_MODEL,
  }
}

function openai(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new PromoError('AI isn’t set up yet (OPENAI_API_KEY is missing).', 503, 'no_api_key')
  // No hidden SDK retries: callStructured retries itself, so every attempt
  // lands in the cost log.
  return new OpenAI({ apiKey, maxRetries: 0 })
}

/** Worth one more try: rate limits, server errors and dropped connections, but not timeouts. */
function isTransient(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionTimeoutError) return false
  if (error instanceof OpenAI.APIConnectionError) return true
  return error instanceof OpenAI.APIError && (error.status === 429 || (error.status ?? 0) >= 500)
}

/** Reasoning models take an effort setting; older chat models reject it. */
function reasoningFor(model: string): { effort: 'low' } | undefined {
  return /^(gpt-5|gpt-6|o\d)/.test(model) ? { effort: 'low' } : undefined
}

function isModelRejection(error: unknown): boolean {
  if (!(error instanceof OpenAI.APIError)) return false
  if (error.status === 404) return true
  if (error.status !== 400) return false
  const message = `${error.message ?? ''}`.toLowerCase()
  return message.includes('model') || message.includes('reasoning') || message.includes('unsupported')
}

/** Turns SDK failures into messages she can act on. Nothing here changes her design. */
function toPromoError(error: unknown): unknown {
  if (error instanceof PromoError) return error
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new PromoError('The AI took too long. Your design is unchanged; try again.', 504, 'timeout')
  }
  if (error instanceof OpenAI.APIError) {
    if (error.status === 429) return new PromoError('The AI service is busy. Try again in a minute.', 429, 'rate_limited')
    if (error.status === 401) return new PromoError('AI isn’t set up correctly (API key rejected).', 503, 'bad_api_key')
    return new PromoError('The AI service had a problem. Your design is unchanged; try again.', 502, 'ai_error')
  }
  return error
}

export type InputPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'low' | 'high' | 'auto' }

export interface StructuredCall<S extends z.ZodType> {
  ownerId: string
  kind: AiCallKind
  schema: S
  schemaName: string
  instructions: string
  input: string | InputPart[]
  designId?: string | null
  assetId?: string | null
  maxOutputTokens?: number
  timeoutMs?: number
}

export interface StructuredResult<T> {
  data: T
  model: string
  callId: string | null
  costMicros: number
}

/** Reads the reply against the schema; returns an error code instead of throwing so usage still gets logged. */
function readOutput<S extends z.ZodType>(
  response: OpenAI.Responses.Response,
  schema: S
): { data: z.infer<S> } | { errorCode: string } {
  if (response.status === 'incomplete') {
    return { errorCode: `incomplete_${response.incomplete_details?.reason ?? 'unknown'}` }
  }
  const refused = response.output.some(
    (item) => item.type === 'message' && item.content.some((part) => part.type === 'refusal')
  )
  if (refused) return { errorCode: 'refusal' }
  let json: unknown
  try {
    json = JSON.parse(response.output_text)
  } catch {
    return { errorCode: 'invalid_json' }
  }
  const result = schema.safeParse(json)
  return result.success ? { data: result.data } : { errorCode: 'schema_mismatch' }
}

export async function callStructured<S extends z.ZodType>(
  call: StructuredCall<S>
): Promise<StructuredResult<z.infer<S>>> {
  const client = openai()
  const models = textModels()

  const attempt = async (model: string): Promise<StructuredResult<z.infer<S>>> => {
    const started = Date.now()
    let response: OpenAI.Responses.Response
    try {
      response = await client.responses.create(
        {
          model,
          instructions: call.instructions,
          input: typeof call.input === 'string' ? call.input : [{ role: 'user', content: call.input }],
          text: { format: zodTextFormat(call.schema, call.schemaName) },
          reasoning: reasoningFor(model),
          max_output_tokens: call.maxOutputTokens ?? 2000,
          store: false,
        },
        { timeout: call.timeoutMs ?? 25_000 }
      )
    } catch (error) {
      await logAiCall({
        ownerId: call.ownerId,
        kind: call.kind,
        model,
        status: 'error',
        latencyMs: Date.now() - started,
        designId: call.designId,
        assetId: call.assetId,
        errorCode:
          error instanceof OpenAI.APIConnectionTimeoutError
            ? 'timeout'
            : error instanceof OpenAI.APIError
              ? `http_${error.status ?? 'unknown'}`
              : 'exception',
      })
      throw error
    }

    const usage = {
      inputTokens: response.usage?.input_tokens ?? 0,
      cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    }
    const cost = costMicros(model, usage)
    const output = readOutput(response, call.schema)
    const callId = await logAiCall({
      ownerId: call.ownerId,
      kind: call.kind,
      model,
      status: 'data' in output ? 'ok' : 'invalid',
      ...usage,
      costMicros: cost,
      latencyMs: Date.now() - started,
      designId: call.designId,
      assetId: call.assetId,
      errorCode: 'data' in output ? null : output.errorCode,
    })
    if (!('data' in output)) {
      throw new PromoError('The AI reply didn’t come back complete. Try again.', 502, output.errorCode)
    }
    return { data: output.data, model, callId, costMicros: cost }
  }

  const withRetry = async (model: string) => {
    try {
      return await attempt(model)
    } catch (error) {
      if (!isTransient(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, 800))
      return attempt(model)
    }
  }

  const useFallback = primaryRejected && models.fallback !== models.primary
  try {
    return await withRetry(useFallback ? models.fallback : models.primary)
  } catch (error) {
    if (!useFallback && isModelRejection(error) && models.fallback !== models.primary) {
      primaryRejected = true
      console.warn(`[promo] ${models.primary} was rejected; using ${models.fallback}`)
      try {
        return await withRetry(models.fallback)
      } catch (fallbackError) {
        throw toPromoError(fallbackError)
      }
    }
    throw toPromoError(error)
  }
}
