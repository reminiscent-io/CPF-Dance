import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { upgradeDocument } from '@/lib/promo/document'
import { loadTemplateVersion } from '@/lib/promo/server/catalog'
import { isUuid, PromoError, promoErrorResponse, requirePromoInstructor } from '@/lib/promo/server/context'
import { DESIGN_COLUMNS, loadDesign } from '@/lib/promo/server/designs'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({ revision: z.number().int().positive() })

/**
 * "Update to latest template": re-pins the design to the template's live
 * version, keeping what maps across. The old document goes into the
 * revision history first, so the update can be undone from there.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, ownerId } = await requirePromoInstructor()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Promo not found.', 404, 'not_found')
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) throw new PromoError('Reload and try again.', 400)

    const design = await loadDesign(supabase, id)
    if (design.revision !== parsed.data.revision) {
      throw new PromoError('This promo changed on another device. Reload first.', 409, 'conflict')
    }
    const from = await loadTemplateVersion(supabase, design.template_version_id)
    const { data: template, error } = await supabase
      .from('promo_templates')
      .select('current_version_id')
      .eq('id', from.templateId)
      .maybeSingle()
    if (error) throw error
    if (!template?.current_version_id || template.current_version_id === from.id) {
      throw new PromoError('This promo already uses the latest template.', 400, 'up_to_date')
    }
    const to = await loadTemplateVersion(supabase, template.current_version_id)
    if (!to.definition.formats[design.format]) {
      throw new PromoError('The new template version has no layout for this format.', 400, 'no_format')
    }
    const { document, dropped } = upgradeDocument(design.document, from.definition, to.definition, design.format)

    await supabase.from('promo_design_revisions').insert({
      design_id: design.id,
      owner_id: ownerId,
      revision: design.revision,
      document: design.document,
      source: 'checkpoint',
      summary: `Before updating to template version ${to.version}`,
    })
    const { data: updated, error: updateError } = await supabase
      .from('promo_designs')
      .update({ template_version_id: to.id, document, revision: design.revision + 1 })
      .eq('id', design.id)
      .eq('revision', design.revision)
      .select(DESIGN_COLUMNS)
    if (updateError) throw updateError
    if (!updated?.length) throw new PromoError('This promo changed on another device. Reload first.', 409, 'conflict')
    return NextResponse.json({ design: updated[0], version: to.version, dropped })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/promo/designs/[id]/upgrade')
  }
}
