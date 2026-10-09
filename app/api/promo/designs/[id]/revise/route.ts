import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertWithinBudget } from '@/lib/promo/ai/log'
import { applyRevision, buildReviseSchema, REVISE_INSTRUCTIONS, reviseInput, type ReviseReply } from '@/lib/promo/ai/revise'
import { callStructured } from '@/lib/promo/ai/structured'
import { completeBrandTokens } from '@/lib/promo/brand'
import { documentAssetIds, isSessionList, normalizeDocument, resolveSlotValue } from '@/lib/promo/document'
import { DesignDocumentSchema } from '@/lib/promo/schema'
import { loadTemplateVersion } from '@/lib/promo/server/catalog'
import { ASSET_COLUMNS, isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import { loadDesign } from '@/lib/promo/server/designs'
import type { AssetPose, AssetTags, DesignDocument } from '@/lib/promo/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const BodySchema = z.object({
  instruction: z.string().trim().min(2).max(300),
  /** What she sees now, which can be a second ahead of the last autosave. */
  document: DesignDocumentSchema,
})

/**
 * "Make it more dramatic": one model call returns operations; code applies
 * the allowed ones to her current document and sends the result back. The
 * browser swaps it in as one undoable step and autosave stores it, so this
 * route never races autosave for the design row. It does record the result
 * in the revision history.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('Say what to change, in a few words.', 400)
    const design = await loadDesign(supabase, id)
    const { definition } = await loadTemplateVersion(supabase, design.template_version_id)
    const brand = completeBrandTokens(design.brand_snapshot)
    const document = normalizeDocument(parsed.data.document as DesignDocument, definition)

    const photoIds = [...new Set([...documentAssetIds(document), ...(design.brief?.photoIds ?? [])])]
    const { data: rows, error } = photoIds.length
      ? await supabase.from('promo_assets').select(ASSET_COLUMNS).in('id', photoIds)
      : { data: [], error: null }
    if (error) throw error
    const photos = (rows ?? []).map((row) => ({
      id: row.id as string,
      tags: (row.tags ?? {}) as AssetTags,
      pose: (row.pose ?? null) as AssetPose | null,
    }))

    await assertWithinBudget(ownerId, 'revise')

    const context = { definition, brand, document, instruction: parsed.data.instruction, photos }
    const banned = brand.voice.bannedWords.join(', ') || 'none'
    const { data, callId } = await callStructured({
      ownerId,
      kind: 'revise',
      designId: design.id,
      schema: buildReviseSchema(
        definition,
        photos.map((photo) => photo.id)
      ),
      schemaName: 'promo_revision',
      instructions: `${REVISE_INSTRUCTIONS}\n\nVoice: ${brand.voice.notes}\nNever use these words: ${banned}.`,
      input: reviseInput(context),
      maxOutputTokens: 2500,
      timeoutMs: 25_000,
    })
    const reply = data as ReviseReply

    const sessionsSlot = definition.slots.find((slot) => slot.kind === 'sessions')
    const sessions = sessionsSlot ? resolveSlotValue(sessionsSlot, document, brand) : undefined
    const outcome = applyRevision(context, reply.ops, {
      bannedWords: brand.voice.bannedWords,
      sessionCount: isSessionList(sessions) ? sessions.length : 0,
    })

    await supabase.from('promo_design_revisions').insert({
      design_id: design.id,
      owner_id: ownerId,
      revision: design.revision,
      document: outcome.document,
      source: 'ai_revise',
      instruction: parsed.data.instruction,
      summary: reply.summary.slice(0, 500),
      ai_call_id: callId,
    })

    return NextResponse.json({
      document: outcome.document,
      summary: reply.summary,
      applied: outcome.applied,
      skipped: outcome.skipped,
      changed: outcome.applied.length > 0,
    })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/revise')
  }
}
