import { NextRequest } from 'next/server'
import {
  ANGLES,
  buildVariationSchema,
  documentFromVariation,
  fallbackDocument,
  inputFor,
  instructionsFor,
  variationProblems,
  type GenerationPhoto,
  type Variation,
} from '@/lib/promo/ai/generate'
import { assertWithinBudget } from '@/lib/promo/ai/log'
import { callStructured } from '@/lib/promo/ai/structured'
import { factValues } from '@/lib/promo/document'
import { PromoBriefSchema } from '@/lib/promo/schema'
import { activeTemplateBySlug, loadStudioBrand } from '@/lib/promo/server/catalog'
import { ASSET_COLUMNS, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import type { AssetPose, AssetTags, PromoBrief } from '@/lib/promo/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/** Whole request budget; a retry only starts if this much time is left. */
const DEADLINE_MS = 28_000
const FIRST_TIMEOUT_MS = 15_000
const MIN_RETRY_MS = 6_000

/**
 * Three variations of a new promo, streamed as NDJSON so the first card
 * renders as soon as it passes the checks:
 *   {"type":"variation","index":0,"angle":"technique","label":"…","document":{…},"callId":"…"}
 *   {"type":"done","produced":3,"fallback":{…}|null,"message":"…"|null}
 * The fallback is the facts-only document, sent when no variation survived,
 * so the editor never opens blank.
 */
export async function POST(request: NextRequest) {
  let prepared: Awaited<ReturnType<typeof prepare>>
  try {
    prepared = await prepare(request)
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/generate')
  }
  const { ownerId, brief, template, brand, photos } = prepared
  const definition = template.version.definition
  const facts = factValues(definition, brief)
  const context = { bannedWords: brand.voice.bannedWords, sessionCount: brief.sessions.length }
  const schema = buildVariationSchema(definition, brief.photoIds)
  const input = inputFor(definition, brief, photos)
  const started = Date.now()

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (message: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(message)}\n`))
      const failures: string[] = []

      const generate = async (angle: (typeof ANGLES)[number], index: number) => {
        let problems: string[] = []
        let previous: Variation | null = null
        for (let attempt = 0; attempt < 2; attempt++) {
          const remaining = DEADLINE_MS - (Date.now() - started)
          if (attempt > 0 && remaining < MIN_RETRY_MS) break
          // The first calls may have used the rest of the month's budget.
          if (attempt > 0) await assertWithinBudget(ownerId, 'generate')
          const retryNote = previous
            ? `\n\nYour previous answer:\n${JSON.stringify(previous)}\n\nIt had these problems. Fix all of them:\n- ${problems.join('\n- ')}`
            : ''
          const { data, callId, model } = await callStructured({
            ownerId,
            kind: 'generate',
            schema,
            schemaName: 'promo_variation',
            instructions: instructionsFor(brand, angle, context.sessionCount),
            input: input + retryNote,
            maxOutputTokens: 3000,
            timeoutMs: attempt === 0 ? FIRST_TIMEOUT_MS : remaining,
          })
          const variation = data as Variation
          problems = variationProblems(definition, variation, brief.photoIds, context)
          if (problems.length === 0) {
            send({
              type: 'variation',
              index,
              angle: angle.id,
              label: angle.label,
              document: documentFromVariation(definition, facts, variation, photos),
              callId,
              model,
            })
            return true
          }
          previous = variation
        }
        throw new PromoError(`A variation didn’t pass the checks: ${problems.slice(0, 2).join(' ')}`, 422, 'invalid')
      }

      const results = await Promise.allSettled(ANGLES.map((angle, index) => generate(angle, index)))
      for (const result of results) {
        if (result.status === 'rejected') {
          const reason = result.reason
          failures.push(reason instanceof PromoError ? reason.message : 'The AI service had a problem.')
          if (!(reason instanceof PromoError)) console.error('[promo] generate:', reason)
        }
      }
      const produced = results.filter((result) => result.status === 'fulfilled').length
      send({
        type: 'done',
        produced,
        templateVersionId: template.version.id,
        fallback: produced === 0 ? fallbackDocument(definition, brief, facts, photos, context) : null,
        message: produced === 0 ? (failures[0] ?? 'The AI didn’t return anything usable.') : null,
      })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}

/** Everything that can fail before streaming starts, so it fails as a plain JSON error. */
async function prepare(request: NextRequest) {
  const { supabase, ownerId } = await requirePromoInstructor()
  const parsed = PromoBriefSchema.safeParse(await request.json())
  if (!parsed.success) {
    throw new PromoError(parsed.error.issues[0]?.message ?? 'The brief is missing details.', 400, 'bad_brief')
  }
  const brief = parsed.data as PromoBrief
  const [template, brand] = await Promise.all([activeTemplateBySlug(supabase), loadStudioBrand(supabase)])
  if (!template.version.definition.formats[brief.format]) {
    throw new PromoError('This template has no layout for that format.', 400, 'no_format')
  }

  const { data: rows, error } = await supabase
    .from('promo_assets')
    .select(ASSET_COLUMNS)
    .eq('owner_id', ownerId)
    .in('id', brief.photoIds)
  if (error) throw error
  const byId = new Map((rows ?? []).map((row) => [row.id as string, row]))
  const photos: GenerationPhoto[] = brief.photoIds
    .map((id) => byId.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => ({
      id: row.id,
      width: row.width,
      height: row.height,
      tags: (row.tags ?? {}) as AssetTags,
      pose: (row.pose ?? null) as AssetPose | null,
    }))
  if (photos.length !== brief.photoIds.length) {
    throw new PromoError('Some of those photos aren’t in your library anymore. Pick again.', 400, 'missing_photos')
  }

  await assertWithinBudget(ownerId, 'generate')
  return { ownerId, brief, template, brand, photos }
}
