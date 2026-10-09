import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertWithinBudget } from '@/lib/promo/ai/log'
import { callStructured, type InputPart } from '@/lib/promo/ai/structured'
import { applyTagResult, TAG_INSTRUCTIONS, TagResultSchema } from '@/lib/promo/ai/tag'
import {
  ASSET_COLUMNS,
  PROMO_BUCKET,
  PromoError,
  promoErrorResponse,
  requirePromoInstructor,
} from '@/lib/promo/server/context'
import type { AssetPose, AssetTags } from '@/lib/promo/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const BodySchema = z.object({ ids: z.array(z.guid()).min(1).max(10) })

/**
 * Tags a batch of photos with one vision call on their 400 px thumbnails.
 * Thumbnails go to OpenAI as base64 from the server; no photo ever gets a
 * public or signed URL. Photos she tagged by hand are skipped.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('Pick between one and ten photos to tag.', 400)

    const { data: rows, error } = await supabase
      .from('promo_assets')
      .select(ASSET_COLUMNS)
      .eq('owner_id', ownerId)
      .eq('tags_edited', false)
      .in('id', parsed.data.ids)
    if (error) throw error
    if (!rows || rows.length === 0) return NextResponse.json({ assets: [] })

    await assertWithinBudget(ownerId, 'tag')

    const parts: InputPart[] = []
    for (const row of rows) {
      const { data: blob, error: downloadError } = await supabase.storage.from(PROMO_BUCKET).download(row.thumb_path)
      if (downloadError || !blob) continue
      const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64')
      parts.push({ type: 'input_text', text: `Photo id: ${row.id}` })
      parts.push({ type: 'input_image', image_url: `data:image/jpeg;base64,${base64}`, detail: 'low' })
    }
    if (parts.length === 0) throw new PromoError('Couldn’t read those photos. Try again.', 502)

    const { data: result } = await callStructured({
      ownerId,
      kind: 'tag',
      schema: TagResultSchema,
      schemaName: 'photo_tags',
      instructions: TAG_INSTRUCTIONS,
      input: parts,
      maxOutputTokens: 300 * rows.length + 200,
      timeoutMs: 45_000,
    })

    const byId = new Map(rows.map((row) => [row.id, row]))
    const updated = []
    for (const photo of result.photos) {
      const row = byId.get(photo.id)
      if (!row) continue
      const next = applyTagResult({ tags: (row.tags ?? {}) as AssetTags, pose: row.pose as AssetPose | null }, photo)
      // Only if she hasn't corrected the tags while the call ran.
      const { data: asset, error: updateError } = await supabase
        .from('promo_assets')
        .update({ tags: next.tags, pose: next.pose, tagged_at: new Date().toISOString() })
        .eq('id', row.id)
        .eq('tags_edited', false)
        .select(ASSET_COLUMNS)
        .maybeSingle()
      if (!updateError && asset) updated.push(asset)
    }
    return NextResponse.json({ assets: updated })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/assets/tag')
  }
}
