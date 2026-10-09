import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { documentForSibling } from '@/lib/promo/document'
import { loadTemplateVersion } from '@/lib/promo/server/catalog'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import { DESIGN_COLUMNS, loadDesign } from '@/lib/promo/server/designs'
import type { PromoFormat } from '@/lib/promo/types'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({ formats: z.array(z.enum(['ig_post', 'ig_story', 'poster'])).min(1).max(3) })

/**
 * "Make story", "Make poster", "Make all formats": copies the slot values and
 * photos into the same template's other layouts, in the same group. Nudges
 * and frozen line breaks stay behind; they belong to the original canvas.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('Pick a format to make.', 400)

    const source = await loadDesign(supabase, id)
    if (source.owner_id !== ownerId) {
      throw new PromoError('Only the promo’s owner can add formats.', 403, 'not_owner')
    }
    const version = await loadTemplateVersion(supabase, source.template_version_id)

    const { data: group, error: groupError } = await supabase
      .from('promo_designs')
      .select('id, format')
      .eq('group_id', source.group_id)
    if (groupError) throw groupError
    const have = new Set((group ?? []).map((row) => row.format as PromoFormat))
    const wanted = [...new Set(parsed.data.formats)].filter(
      (format) => !have.has(format) && version.definition.formats[format]
    )

    const created = []
    for (const format of wanted) {
      const { data: design, error } = await supabase
        .from('promo_designs')
        .insert({
          owner_id: ownerId,
          title: source.title,
          template_version_id: source.template_version_id,
          format,
          group_id: source.group_id,
          class_ids: source.class_ids,
          brief: { ...source.brief, format },
          document: documentForSibling(source.document),
          brand_snapshot: source.brand_snapshot,
        })
        .select(DESIGN_COLUMNS)
        .single()
      if (error) throw error
      created.push(design)
    }
    return NextResponse.json({ designs: created }, { status: 201 })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/siblings')
  }
}
