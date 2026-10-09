import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkTemplateIntegrity } from '@/lib/promo/schema'
import { parseDefinition } from '@/lib/promo/server/catalog'
import { isUuid, PromoError, promoErrorResponse, requirePromoAdmin } from '@/lib/promo/server/context'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({ notes: z.string().trim().max(500).optional() })

/**
 * Publishes the draft as the template's new version. From then on the row
 * is frozen (a trigger refuses changes), and saved designs stay on the
 * version they were made from.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, profile } = await requirePromoAdmin()
    const { id } = await params
    if (!isUuid(id)) throw new PromoError('Template not found.', 404)
    const parsed = BodySchema.safeParse(await request.json().catch(() => ({})))
    if (!parsed.success) throw new PromoError('Notes are limited to 500 characters.', 400)

    const { data: draft, error } = await supabase
      .from('promo_template_versions')
      .select('id, version, definition')
      .eq('template_id', id)
      .is('published_at', null)
      .maybeSingle()
    if (error) throw error
    if (!draft) throw new PromoError('There’s no draft to publish.', 400, 'no_draft')

    const problems = checkTemplateIntegrity(parseDefinition(draft.definition, `draft ${draft.id}`))
    if (problems.length) {
      return NextResponse.json({ error: 'Fix the layout problems before publishing.', code: 'integrity', problems }, { status: 400 })
    }

    const { error: publishError } = await supabase
      .from('promo_template_versions')
      .update({ published_at: new Date().toISOString(), published_by: profile.id, notes: parsed.data.notes || null })
      .eq('id', draft.id)
      .is('published_at', null)
    if (publishError) throw publishError
    const { error: linkError } = await supabase.from('promo_templates').update({ current_version_id: draft.id }).eq('id', id)
    if (linkError) throw linkError
    return NextResponse.json({ published: { id: draft.id, version: draft.version } })
  } catch (error) {
    return promoErrorResponse(error, 'POST /api/admin/promo/templates/[id]/publish')
  }
}
